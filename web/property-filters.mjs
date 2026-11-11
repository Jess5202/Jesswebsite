export const PROPERTY_FEATURES=[
 {id:'unblocked-view',en:'Unblocked view',zh:'无遮挡景观'},
 {id:'gated-guarded',en:'Gated & guarded',zh:'有保安围篱'},
 {id:'corner-lot',en:'Corner lot',zh:'角头单位'},
 {id:'end-lot',en:'End lot',zh:'尾间单位'},
 {id:'renovated',en:'Renovated',zh:'已装修'},
 {id:'furnished',en:'Furnished',zh:'附家具'}
];
export function detectPropertyFeatures(value){
 const text=String(value||'');
 const rules=[
 ['unblocked-view',/\bunblock(?:ed)?\s*(?:garden\s*)?view\b|无遮挡|无阻挡景观|开阔景观/iu,/\b(?:no|not|without)\s+(?:an?\s+)?unblock(?:ed)?\s*(?:garden\s*)?view|(?:unblock(?:ed)?\s*(?:garden\s*)?view)\s*[:：]\s*(?:no|none)|并非无遮挡|不是无遮挡|非无遮挡|有遮挡/iu],
 ['gated-guarded',/\bgated\s*(?:&|and|\/|及|和)\s*guarded\b|\bg\s*&\s*g\b|有围篱及保安|有保安围篱|保安围篱|保安围籬|围篱及保安/iu,/\b(?:no|not|without|non)[-\s]*(?:gated|g\s*&\s*g)|(?:gated\s*(?:&|and|\/)\s*guarded|g\s*&\s*g)\s*[:：]\s*(?:no|none)|没有保安|无保安|無保安|没有围篱|无围篱|非保安围篱/iu],
 ['corner-lot',/\bcorner\s*(?:lot|unit|house)?\b|角头|角頭|角落单位/iu,/\b(?:not|no)\s+(?:a\s+)?corner|非角头|不是角头/iu],
 ['end-lot',/\bend\s*lot\b|尾间|尾間|尾端单位/iu,/\b(?:not|no)\s+(?:an?\s+)?end\s*lot|非尾间|不是尾间/iu],
 ['renovated',/\b(?:fully\s+|partly\s+)?renovated\b|已装修|全装修|全裝修|精装修|精裝修|装修单位/iu,/\b(?:not|no|un)[-\s]*renovated|未装修|未裝修|没有装修|无装修/iu],
 ['furnished',/\b(?:fully\s+|partly\s+)?furnished\b|附家具|全套家具|全家具|带家具|帶家具/iu,/\bunfurnished\b|\b(?:not|no)\s+(?:fully\s+|partly\s+)?furnished|无家具|無家具|不带家具|不附家具/iu]
 ];
 return rules.filter(([,positive,negative])=>positive.test(text)&&!negative.test(text)).map(([id])=>id);
}
export function getPropertyFeatures(record){
 if(Array.isArray(record.features))return [...new Set(record.features.filter(id=>PROPERTY_FEATURES.some(f=>f.id===id)))];
 return detectPropertyFeatures([record.title,record.type,record.description].filter(Boolean).join('\n'));
}
export function getPropertyGroup(record){
 const text=String(record.type||record.title||'');
 if(/(?<![\d.])(?:1|one|single)[ -]*(?:storey|story|sty)\b|单层|單層/iu.test(text))return 'single';
 if(/(?<![\d.])(?:2|two|double)[ -]*(?:storey|story|sty)\b|双层|雙層/iu.test(text))return 'double';
 if(/(?<![\d.])(?:3|three|triple)[ -]*(?:storey|story|sty)\b|三层|三層/iu.test(text))return 'triple';
 if(/\bcondominium\b|\bcondo\b|\bapartment\b|\bserviced?\s*residence\b|公寓/iu.test(text))return 'condo';
 if(/\bshop|店屋|店面/iu.test(text))return 'shop';
 if(/\bsemi[ -]?d|半独立|半獨立/iu.test(text))return 'semid';
 if(/\bbungalow|独立洋房|独立式|獨立式/iu.test(text))return 'bungalow';
 if(/\bfactory|工厂|工廠/iu.test(text))return 'factory';
 if(/\bland\b|土地|地皮/iu.test(text))return 'land';
 return 'other';
}
export function matchesPropertyFilters(record,filters={}){
 const features=getPropertyFeatures(record);
 if(filters.mode&&filters.mode!=='All'&&record.mode!==filters.mode&&!(filters.mode==='Commercial'&&record.category==='Commercial'))return false;
 if(filters.type&&getPropertyGroup(record)!==filters.type)return false;
 if(filters.location&&getLocationLabel(record.location)!==getLocationLabel(filters.location))return false;
 if(filters.tenure){const tenure=String(record.tenure||'').toLowerCase();if(filters.tenure==='freehold'&&!/freehold|永久/.test(tenure))return false;if(filters.tenure==='leasehold'&&!/leasehold|租赁|租賃/.test(tenure))return false;}
 if(filters.minPrice!==undefined&&Number(record.price)<filters.minPrice)return false;
 if(filters.maxPrice!==undefined&&Number(record.price)>filters.maxPrice)return false;
 if(filters.minBeds){const parts=String(record.beds??'').split('+');if(parts.some(p=>!/^\d+$/.test(p.trim()))||parts.reduce((total,p)=>total+Number(p),0)<filters.minBeds)return false;}
 if((filters.features||[]).some(feature=>!features.includes(feature)))return false;
 if(filters.query){const fold=s=>String(s).toLowerCase().replace(/[\s_\-，,。./&]+/g,'');const descriptions=PROPERTY_FEATURES.filter(f=>features.includes(f.id)).map(f=>f.id+' '+f.en+' '+f.zh+(f.id==='unblocked-view'?' unblockview unblock view unblock garden view':'')+(f.id==='gated-guarded'?' gng g&g':'')).join(' ');const groups={single:'单层 單層 Single storey',double:'双层 雙層 Double storey',triple:'三层 三層 Three storey',condo:'公寓 condo apartment',shop:'店屋 店面 shop',semid:'半独立 semi detached',bungalow:'独立洋房 bungalow',factory:'工厂 factory',land:'土地 land',other:''};const haystack=fold([record.title,record.reference,record.location,record.type,record.description,record.tenure,groups[getPropertyGroup(record)],descriptions].filter(Boolean).join(' '));if(!haystack.includes(fold(filters.query)))return false;}
 return true;
}
export function getLocationLabel(value){
 const original=String(value||'').trim();
 const place=original.includes('@')?original.slice(original.lastIndexOf('@')+1).trim():original;
 const parts=place.split(/[,，]/).map(p=>p.trim()).filter(Boolean);
 const neighbourhood=/^(?:Taman|Tmn\.?|Bandar|Kampung|Kg\.?)\s+/i;
 const area=parts.find(p=>neighbourhood.test(p))||parts.find(p=>! /^(?:No\.?\s*\d|Jalan\b|Lorong\b|Persiaran\b|\d{5}\b|Malaysia\b|Johor$)/i.test(p))||parts[0]||original;
 const simple=area.replace(/^(?:Taman|Tmn\.?|Bandar|Kampung|Kg\.?|Jalan|Lorong|Persiaran)\s+/i,'').replace(/\b\d{5}\b/g,'').replace(/\s+/g,' ').trim()||original;
 const key=simple.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]/g,'');
 const aliases=[['austincrest','Austin Crest'],['horizonhills','Horizon Hills'],['ecosummer','Eco Summer'],['ecospring','Eco Spring'],['setiatropika','Setia Tropika'],['setiaindah','Setia Indah']];
 for(const [prefix,label] of aliases)if(key.startsWith(prefix))return label;
 return simple;
}

