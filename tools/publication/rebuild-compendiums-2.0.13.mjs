#!/usr/bin/env node
/**
 * MERP-UI 2.0.13 — lossless OFFLINE LevelDB rebuild.
 *
 * This operates solely on the eleven distribution packs in a checkout. It never
 * connects to a Foundry World and never edits source/compendiums definitions.
 *
 * The original and replacement LevelDBs are independently iterated using
 * raw Buffer keys and values, with an ordered, length-delimited SHA-256 of
 * every logical entry. A mismatch aborts before any original is replaced.
 */
import { ClassicLevel } from 'classic-level';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync,
         rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';

const root=resolve(process.cwd());
const packsRoot=resolve(root,'packs');
const reportPath=resolve(root,'dist/leveldb-compaction-report.json');
const manifest=JSON.parse((await import('node:fs')).readFileSync(resolve(root,'module.json'),'utf8'));
const assert=(test,message)=>{if(!test)throw new Error(message);};

assert(process.env.CI==='true' && process.env.MERPUI_OFFLINE_PACK_COMPACTION==='1',
  'Refusing to rebuild packs outside a designated offline CI checkout.');
assert(manifest.id==='merp-ui' && manifest.packs?.length===11,
  'Expected MERP-UI with exactly eleven Compendiums');
const expected=['merp-rmu-races','merp-rmu-cultures','merp-rmu-professions',
  'merp-rmu-skills','merp-rmu-spell-lists','merp-rmu-talents-flaws',
  'merp-rmu-herbs','merp-rmu-languages','merp-rmu-rules','merp-ui-lore',
  'merp-ui-creatures'];
assert(expected.every(name=>manifest.packs.some(p=>p.name===name && p.path==='packs/'+name)),
  'Compendium manifest identity or location mismatch');
assert(existsSync(packsRoot),'Missing packs directory');
const stage=mkdtempSync(join(packsRoot,'.merp-offline-rebuild-'));
const encoding={keyEncoding:'buffer',valueEncoding:'buffer'};
const counters=new Map();
const digestEntry=(hash,key,value)=>{
  const header=Buffer.allocUnsafe(8);
  header.writeUInt32BE(key.length,0);header.writeUInt32BE(value.length,4);
  hash.update(header);hash.update(key);hash.update(value);
};
const diskBytes=path=>readdirSync(path,{withFileTypes:true}).reduce((sum,file)=>{
  assert(file.isFile(), 'Unexpected subdirectory in LevelDB pack: '+path+'/'+file.name);
  return sum+statSync(join(path,file.name)).size;
},0);
const packStats=path=>{
  const stat={bytes:diskBytes(path),files:0,ldb:0,log:0,manifests:0};
  for(const filename of readdirSync(path)){
    stat.files++;
    if(filename.endsWith('.ldb'))stat.ldb++;
    if(/^\d+\.log$/.test(filename))stat.log++;
    if(filename.startsWith('MANIFEST-'))stat.manifests++;
  }
  return stat;
};
async function inspect(db){
  const hash=createHash('sha256');let entries=0, keyBytes=0, valueBytes=0;
  const types={};
  for await(const [key,value] of db.iterator()){
    assert(Buffer.isBuffer(key)&&Buffer.isBuffer(value),'Expected byte-preserving Buffer values');
    digestEntry(hash,key,value);entries++;keyBytes+=key.length;valueBytes+=value.length;
    const prefix=key.toString('utf8').split('!',3).slice(0,2).join('!');
    types[prefix]=(types[prefix]??0)+1;
  }
  return {entries,keyBytes,valueBytes,sha256:hash.digest('hex'),types};
}
const requireSame=(a,b,pack)=>{
  assert(a.entries===b.entries && a.sha256===b.sha256 &&
         a.keyBytes===b.keyBytes && a.valueBytes===b.valueBytes,
    'LOSSLESS CHECK FAILED for '+pack+': '+JSON.stringify({before:a,after:b}));
};
const rows=[];
try {
  for(const name of expected){
    const original=resolve(packsRoot,name),fresh=join(stage,name),backup=join(stage,name+'-previous');
    assert(original===resolve(root,'packs',name) && existsSync(join(original,'CURRENT')),
      'Invalid original pack '+name);
    assert(!existsSync(fresh)&&!existsSync(backup),'Refusing to overwrite a staged directory');
    const rawBefore=packStats(original);
    let origin=null, rebuilt=null;
    let before=null,after=null;
    try {
      origin=new ClassicLevel(original,{...encoding,createIfMissing:false});
      rebuilt=new ClassicLevel(fresh,{...encoding,createIfMissing:true,writeBufferSize:256*1024});
      await origin.open();await rebuilt.open();
      before=await inspect(origin);
      assert(before.entries>0,'Unexpected empty pack '+name);
      let buffer=[],pending=0;
      for await(const [key,value] of origin.iterator()){
        buffer.push({type:'put',key,value});pending+=key.length+value.length;
        if(pending>=512*1024 || buffer.length>=40){
          await rebuilt.batch(buffer);buffer=[];pending=0;
        }
      }
      if(buffer.length)await rebuilt.batch(buffer);
      // Force a new, current .ldb even for the smallest packs.
      await rebuilt.compactRange(Buffer.from([0]),Buffer.from([255,255,255,255]));
      after=await inspect(rebuilt);
      requireSame(before,after,name);
    } finally {
      if(rebuilt)await rebuilt.close();
      if(origin)await origin.close();
    }
    // Re-opening independently verifies that both the manifest and
    // newly materialised files support a complete LevelDB recovery.
    const reopened=new ClassicLevel(fresh,{...encoding,createIfMissing:false});
    try {
      await reopened.open();
      requireSame(before,await inspect(reopened),name);
    } finally {await reopened.close();}
    const rawAfter=packStats(fresh);
    assert(rawAfter.ldb>=1 && rawAfter.manifests===1,
      'Fresh '+name+' is missing its single active manifest or .ldb file: '+JSON.stringify(rawAfter));
    // Both databases were closed and fully compared before any rename.
    renameSync(original,backup);
    try {renameSync(fresh,original);}
    catch(error){renameSync(backup,original);throw error;}
    rmSync(backup,{recursive:true,force:true});
    rows.push({pack:name,logical:before,physicalBefore:rawBefore,physicalAfter:rawAfter,
      savedBytes:rawBefore.bytes-rawAfter.bytes});
    console.log(JSON.stringify({pack:name,records:before.entries,sha256:before.sha256,
      beforeBytes:rawBefore.bytes,afterBytes:rawAfter.bytes,savedBytes:rawBefore.bytes-rawAfter.bytes}));
  }
  const total=rows.reduce((sum,row)=>sum+row.savedBytes,0);
  assert(rows.length===11,'Incomplete compendium rebuild');
  const creatures=rows.find(x=>x.pack==='merp-ui-creatures');
  assert(creatures.logical.types['!folders']===26 &&
    creatures.logical.types['!actors']===2 && creatures.logical.types['!actors.items']===55,
    'Creature pack must hold 26 folders, two Actors and 55 embedded Items');
  const lore=rows.find(x=>x.pack==='merp-ui-lore');
  // The Lore data loaded earlier in this workflow must survive intact.
  assert(lore.logical.types['!tables']===2 && lore.logical.types['!tables.results']===1055,
    'Expected two RollTables and 1055 separately stored, parent-referenced TableResults');
  for(const [name,count] of [['merp-rmu-races',12],['merp-rmu-cultures',60],
                             ['merp-rmu-professions',21]]){
    const row=rows.find(x=>x.pack===name);
    assert(row.logical.types['!items']>=count,
      'Incomplete '+name+' Item documents');
  }
  const report={version:manifest.version,packCount:rows.length,identical:true,
    physicalBytesBefore:rows.reduce((sum,row)=>sum+row.physicalBefore.bytes,0),
    physicalBytesAfter:rows.reduce((sum,row)=>sum+row.physicalAfter.bytes,0),
    savedBytes:total,packs:rows};
  mkdirSync(resolve(root,'dist'),{recursive:true});
  writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log('MERP-UI lossless LevelDB rebuild complete: '+JSON.stringify({
    packs:rows.length,savedBytes:total,before:report.physicalBytesBefore,
    after:report.physicalBytesAfter,identical:true
  }));
} finally {
  rmSync(stage,{recursive:true,force:true});
}
