import assert from 'node:assert/strict';import{parsePropertyCopy}from'../web/parse-property-copy.mjs';
const sample=`🔥🏡 FOR SALE｜TAMAN SETIA INDAH 🏡🔥
✨ DOUBLE STOREY TERRACE HOUSE｜双层排屋
💰 RM658K Nego｜Bank Value RM730K++
📍 Taman Setia Indah, 81100 Johor Bahru
😍 最靠近 Mount Austin 的保安围篱排屋之一！
🌿 Unblocked Garden View 花园景观无遮挡
🔐 Gated & Guarded 有围篱及保安
✨ Property Details｜房屋资料
• Double Storey Terrace House 双层排屋
• Land Size: 20’ × 65’
• 3 Bedrooms 3间房
• 3 Bathrooms 3间厕所
• Intermediate Lot 中间单位
• Freehold 永久地契
• Bumi Lot 土著单位（Consent 费用由屋主承担）
• Facing North 朝北
• House Age: 20 Years 屋龄约20年
• Maintenance Fee: RM60/month
• Ground Floor Room Extended to Kitchen 楼下房间扩建为厨房
• Air-conditioning 空调
• Water Heater 热水器
💰 Selling Price：RM658,000 Nego
🏦 Bank Value：RM730,000++
JS3128
Welcome any property SALE/RENT
http://wasap.my/601110977925/JS3128`;
const parsed=parsePropertyCopy(sample);assert.equal(parsed.fields.title,'Taman Setia Indah');assert.equal(parsed.fields.price,658000);assert.equal(parsed.fields.mode,'Buy');assert.equal(parsed.fields.beds,'3');assert.equal(parsed.fields.baths,3);assert.equal(parsed.fields.reference,'JS3128');assert.equal(parsed.fields.landSize,'20’ × 65’');assert.equal(parsed.fields.size,undefined);assert.equal(parsed.fields.location,'Taman Setia Indah, 81100 Johor Bahru');assert.equal(parsed.fields.type,'2-sty Terrace/Link House');assert.equal(parsed.fields.category,'Residential');assert.equal(parsed.fields.tenure,'Freehold 永久地契');assert.equal(parsed.fields.description,sample);assert(!parsed.warnings.some(x=>x.includes('多个不同金额')));
let p=parsePropertyCopy('FOR RENT｜Austin Condo\n📍 Mount Austin, Johor Bahru\nRental: RM2,500/month\nBank Value: RM730K\nMaintenance Fee: RM60/month\n3+1 Bedrooms\n2 Bathrooms\nBuilt-up: 1,200 sqft');assert.equal(p.fields.price,2500);assert.equal(p.fields.mode,'Rent');assert.equal(p.fields.beds,'3+1');assert.equal(p.fields.size,1200);assert.equal(p.fields.type,'Condominium');
p=parsePropertyCopy('出售｜新山双层排屋\n地点：新山\n售价：65.8万\n3间房\n3间厕所\n土地尺寸：20 x 65\n永久地契');assert.equal(p.fields.price,658000);assert.equal(p.fields.beds,'3');assert.equal(p.fields.baths,3);assert.equal(p.fields.type,'2-sty Terrace/Link House');assert.equal(p.fields.size,undefined);
p=parsePropertyCopy('FOR SALE｜Shop Senai\n📍 Senai\nSelling Price: RM1.5M\nBuilt-up: 200 sqm');assert.equal(p.fields.price,1500000);assert.equal(p.fields.category,'Commercial');assert.equal(p.fields.size,undefined);assert(p.warnings.some(x=>x.includes('平方米')));
p=parsePropertyCopy('FOR SALE｜Example\nBank Value: RM730K\nMaintenance Fee: RM60/month');assert.equal(p.fields.price,undefined);assert(p.warnings.some(x=>x.includes('售价')));
p=parsePropertyCopy('FOR SALE｜Example\nRM650K\nSelling Price: RM660K');assert.equal(p.fields.price,660000);assert(p.warnings.some(x=>x.includes('多个不同金额')));
assert.throws(()=>parsePropertyCopy(''));assert.throws(()=>parsePropertyCopy('x'.repeat(12001)));
console.log('PASS: user example, separate sale/bank values, land vs built-up, code, full original copy, English rental, Chinese currency, M suffix, sqm warning, missing price and conflicting prices.');
