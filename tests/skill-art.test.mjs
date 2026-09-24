import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {skillArtName,skillArtStyle} from '../src/ui/skill-art.js';
import {startingSkillOptions} from '../src/ui/starting-skill-view.js';
import {loadoutView} from '../src/ui/journey-view.js';
import {IDENTITIES} from '../src/config/constants.js';

const skills=JSON.parse(fs.readFileSync(new URL('../src/data/skills.json',import.meta.url),'utf8')).data;

test('all hundred martial arts resolve to bundled, reusable scene backgrounds',()=>{
 assert.equal(skills.length,100);
 for(const skill of skills){
  const art=skillArtName(skill);
  assert.ok(fs.existsSync(new URL(`../assets/skills/${art}.jpg`,import.meta.url)),`${skill.id} (${skill.name}) lacks ${art}.jpg`);
  assert.match(skillArtStyle(skill),/--skill-art:url\('\.\.\/assets\/skills\/[a-z]+\.jpg'\)/);
 }
 assert.equal(skillArtName(skills.find(skill=>skill.id==='skill_033')),'healing');
 assert.equal(skillArtName(skills.find(skill=>skill.id==='skill_041')),'posture');
 assert.equal(skillArtName(skills.find(skill=>skill.id==='skill_074')),'footwork');
});

test('starting choices and equipped slots carry their matched art',()=>{
 const options=IDENTITIES.flatMap(identity=>startingSkillOptions(identity,skills));
 assert.equal(options.length,18);
 assert.ok(options.every(option=>fs.existsSync(new URL(`../assets/skills/${option.art}.jpg`,import.meta.url))));
 const html=loadoutView({equippedSkills:['skill_003'],innerArts:{},equipment:{}},{skills,innerArts:[],equipment:[]});
 assert.match(html,/class="skill-art-card loadout-art-card" style="--skill-art:url\('\.\.\/assets\/skills\/fist\.jpg'\)"/);
});
