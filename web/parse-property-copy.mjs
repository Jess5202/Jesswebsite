import {detectPropertyFeatures} from './property-filters.mjs';
export function parsePropertyCopy(raw){
 if(typeof raw!=='string'||!raw.trim())throw new Error('请先粘贴房源文案。');
 if(raw.length>12000)throw new Error('文案超过12,000字，请先精简后再整理。');
 const text=raw.replace(/&#x20;|&nbsp;/gi,' ').replace(/\r\n?/g,'\n').replace(/\\#/g,'#');
 const lines=text.split('\n').map(x=>x.trim()).filter(Boolean),head=lines.slice(0,14).join('\n');
 const fields={description:raw.trim(),features:detectPropertyFeatures(text)},warnings=[];
 const tidy=value=>value.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})’'。]+$/gu,'').trim();
 const sale=head.search(/\bFOR\s+SALE\b|\bWTS\b|(?:^|[｜|：:\s])出售(?:[｜|：:\s]|$)/iu),rent=head.search(/\bFOR\s+RENT\b|\bWTL\b|(?:^|[｜|：:\s])出租(?:[｜|：:\s]|$)/iu);
 if(sale>=0||rent>=0)fields.mode=rent>=0&&(sale<0||rent<sale)?'Rent':'Buy';
 let title=lines.slice(0,5).map(line=>line.match(/(?:FOR\s+(?:SALE|RENT)|WTS|WTL|出售|出租)\s*[|｜:：-]\s*(.+)/iu)).find(Boolean)?.[1];
 if(title){title=tidy(title);if(title&&/^[A-Z\d '\-]+$/.test(title))title=title.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());if(title)fields.title=title.slice(0,160);}
 const locationLine=lines.find(line=>/^\s*(?:📍|(?:Location|Address|地点|地址)\s*[:：])/iu.test(line));
 if(locationLine){const location=locationLine.replace(/^\s*(?:📍\s*|(?:Location|Address|地点|地址)\s*[:：]\s*)/iu,'');if(location.trim())fields.location=location.trim().slice(0,220);}
 if(!fields.title&&fields.location)fields.title=fields.location.split(/[,，]/)[0].trim();
 const parseMoney=value=>{const m=value.match(/(?:RM\s*)?([\d][\d,]*(?:\.\d+)?)\s*(million|mil|[km]|万|千)?/iu);if(!m)return null;const scale={million:1e6,mil:1e6,m:1e6,k:1000,'万':10000,'千':1000};const amount=Number(m[1].replaceAll(',',''))*(scale[m[2]?.toLowerCase()]||1);return Number.isFinite(amount)&&amount>0?amount:null;};
 const saleLabels=/(?:Selling\s*Price|Sale\s*Price|Asking\s*Price|售价|卖价|出售价格)\s*[:：]?\s*(?:RM\s*)?([\d][\d,]*(?:\.\d+)?\s*(?:million|mil|[km]|万|千)?)/iu;
 const rentLabels=/(?:Monthly\s*Rent(?:al)?|Rent(?:al)?\s*Price|Rental|租金|月租)\s*[:：]?\s*(?:RM\s*)?([\d][\d,]*(?:\.\d+)?\s*(?:million|mil|[km]|万|千)?)/iu;
 const explicit=lines.map(line=>line.match(fields.mode==='Rent'?rentLabels:saleLabels)).find(Boolean);
 if(explicit)fields.price=parseMoney(explicit[1]);
 const priceLines=lines.filter(line=>!/^(?:[^\p{L}\p{N}]*)(?:Bank\s*Value|Valuation|Maintenance|Management|银行估价|银行估值|管理费|估价)/iu.test(line)).map(line=>line.split(/Bank\s*Value|Valuation|银行估价|银行估值/iu)[0]);
 const advertised=priceLines.filter(line=>!/(?:maintenance|management\s*fee|管理费|估价|valuation)/iu.test(line)).map(line=>{const m=line.match(/RM\s*[\d][\d,]*(?:\.\d+)?\s*(?:million|mil|[km]|万|千)?/iu);return m?parseMoney(m[0]):null;}).filter(x=>x!==null);
 if(!fields.price&&advertised.length)fields.price=advertised[0];
 if(new Set(advertised).size>1)warnings.push('文案出现多个不同金额，请确认下方价格是售价或月租，而非估价或其他费用。');
 const houseText=lines.slice(0,35).join('\n');
 const definitions=[[/\b(?:3|three|triple)[ -]*(?:storey|story|sty).*?(?:terrace|link)|三层排屋/iu,'3-sty Terrace/Link House','Residential'],[/\b(?:2|two|double)[ -]*(?:storey|story|sty).*?(?:terrace|link)|双层排屋/iu,'2-sty Terrace/Link House','Residential'],[/\b(?:1|one|single)[ -]*(?:storey|story|sty).*?(?:terrace|link)|单层排屋/iu,'1-sty Terrace/Link House','Residential'],[/\bsemi[ -]?d(?:etached)?\b|半独立/iu,'Semi-detached House','Residential'],[/\bbungalow\b|独立式洋房|独立洋房/iu,'Bungalow','Residential'],[/\bserviced?\s*residence\b|服务式公寓/iu,'Serviced Residence','Residential'],[/\bcondominium\b|\bcondo\b|公寓/iu,'Condominium','Residential'],[/\bapartment\b/iu,'Apartment','Residential'],[/\b(?:shop|shophouse|shoplot)\b|店屋|店面/iu,'Shop','Commercial'],[/\bfactory\b|工厂/iu,'Factory','Commercial'],[/\b(?:industrial\s+land|commercial\s+land)\b|工业地|商业地/iu,'Land','Commercial']];
 const found=definitions.find(([pattern])=>pattern.test(houseText));if(found){fields.type=found[1];fields.category=found[2];}
 let match=text.match(/(\d+(?:\s*\+\s*\d+)?)\s*(?:Bedrooms?\b|Beds?\b|间房|房(?:\s|$))/iu)||text.match(/(?:Bedrooms?|Beds?|房间|卧室)\s*[:：]\s*(\d+(?:\s*\+\s*\d+)?)/iu);if(match)fields.beds=match[1].replace(/\s/g,'');else if(/\bstudio\b/iu.test(head))fields.beds='Studio';
 match=text.match(/(\d+)\s*(?:Bathrooms?\b|Baths?\b|间厕所|厕所|厕(?:\s|$))/iu)||text.match(/(?:Bathrooms?|Baths?|浴室|厕所)\s*[:：]\s*(\d+)/iu);if(match)fields.baths=Number(match[1]);
 const land=lines.find(line=>/(?:Land\s*Size|Land\s*Area|土地尺寸|土地面积)\s*[:：]/iu.test(line));if(land)fields.landSize=land.split(/(?:Land\s*Size|Land\s*Area|土地尺寸|土地面积)\s*[:：]/iu)[1]?.trim().slice(0,100);
 match=text.match(/(?:Built[ -]?up(?:\s*(?:size|area))?|Buildup|建筑面积)\s*[:：]\s*([\d,]+(?:\.\d+)?)\s*(sq\.?\s*ft|sqft|square\s*feet|平方尺|平方英尺|sqm|m²|平方米)?/iu);if(match){if(match[2]&&/sqm|m²|平方米/iu.test(match[2]))warnings.push('建筑面积使用平方米，请先换算成平方尺再填入建筑面积。');else if(match[2])fields.size=Number(match[1].replaceAll(',',''));else warnings.push('文案中的建筑面积未注明单位，请确认平方尺数后再填写。');}
 if(/\bfreehold\b|永久地契/iu.test(houseText))fields.tenure='Freehold 永久地契';else if(/\bleasehold\b|租赁地契/iu.test(houseText))fields.tenure='Leasehold 租赁地契';
 match=text.match(/^\s*([A-Z]{1,6}\d{3,10})\s*$/m)||text.match(/wasap\.my\/\d+\/([A-Z]{1,6}\d{3,10})(?:\b|\/|\))/i);if(match)fields.reference=match[1].toUpperCase();
 const post=text.match(/https:\/\/(?:www\.)?facebook\.com\/(?:share\/p\/|[^\s)\]]+\/posts\/)[^\s)\]🕹]+/iu);if(post)fields.sourceUrl=post[0];
 for(const [key,label]of [['title','标题'],['location','地点'],['mode','出售／出租'],['price','售价／月租'],['type','房产类型']])if(fields[key]===undefined||fields[key]===null||fields[key]==='')warnings.push('未能确认'+label+'，请在下方补充。');
 if(fields.size===undefined)warnings.push('建筑面积未识别，已留空；土地尺寸不会当成建筑面积。');
 return {fields,warnings};
}
