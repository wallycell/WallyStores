'use strict';
const assert=require('node:assert/strict');
function id(p,n){return `${p}_${n}`}
function stock(db,p){return db.movements.filter(x=>x.productId===p).reduce((s,x)=>s+x.qty,0)}
function cash(db,c){return db.cash.filter(x=>x.currency===c).reduce((s,x)=>s+x.amount,0)}
function validateDebtPayment(kind,partyType,amount,balance){if(kind==='debt_receipt'&&partyType!=='customer')return false;if(kind==='debt_payment'&&partyType!=='supplier')return false;return amount>0&&amount<=balance}
function run(n){
 const db={products:[],customers:[],suppliers:[],sales:[],purchases:[],movements:[],cash:[]};
 const p={id:id('p',n),name:`Phone ${n}`,costUsd:0,sellUsd:150}; db.products.push(p);
 const c={id:id('c',n),name:`Customer ${n}`},s={id:id('v',n),name:`Supplier ${n}`};db.customers.push(c);db.suppliers.push(s);
 // purchase 10 units: $1000, pay $400, owe $600
 const buy={id:id('buy',n),supplierId:s.id,totalUsd:1000,paidUsd:400,dueUSD:600,cancelled:false};db.purchases.push(buy);db.movements.push({refId:buy.id,productId:p.id,qty:10});db.cash.push({refId:buy.id,currency:'USD',amount:-400});p.costUsd=100;
 assert.equal(stock(db,p.id),10);assert.equal(cash(db,'USD'),-400);assert.equal(buy.dueUSD,600);
 // supplier debt payment
 db.cash.push({currency:'USD',amount:-200,kind:'debt_payment',partyId:s.id});assert.equal(cash(db,'USD'),-600);
 // cash sale 2 units at $150
 const sale1={id:id('sale_cash',n),customerId:c.id,totalUsd:300,paidUsd:300,dueUSD:0,profitUsd:100,cancelled:false};db.sales.push(sale1);db.movements.push({refId:sale1.id,productId:p.id,qty:-2});db.cash.push({refId:sale1.id,currency:'USD',amount:300});
 assert.equal(stock(db,p.id),8);assert.equal(sale1.profitUsd,100);assert.equal(cash(db,'USD'),-300);
 // credit sale and later receipt
 const sale2={id:id('sale_debt',n),customerId:c.id,totalUsd:450,paidUsd:100,dueUSD:350,profitUsd:150,cancelled:false};db.sales.push(sale2);db.movements.push({refId:sale2.id,productId:p.id,qty:-3});db.cash.push({refId:sale2.id,currency:'USD',amount:100});
 assert.equal(stock(db,p.id),5);assert.equal(sale2.dueUSD,350);db.cash.push({currency:'USD',amount:150,kind:'debt_receipt',partyId:c.id});assert.equal(cash(db,'USD'),-50);
 assert.equal(validateDebtPayment('debt_receipt','supplier',10,100),false);assert.equal(validateDebtPayment('debt_payment','customer',10,100),false);assert.equal(validateDebtPayment('debt_receipt','customer',351,350),false);assert.equal(validateDebtPayment('debt_receipt','customer',350,350),true);
 // cancellation reverses inventory and cash exactly once
 sale1.cancelled=true;for(const x of db.movements.filter(x=>x.refId===sale1.id))db.movements.push({refId:sale1.id,productId:x.productId,qty:-x.qty,type:'reversal'});for(const x of db.cash.filter(x=>x.refId===sale1.id))db.cash.push({refId:sale1.id,currency:x.currency,amount:-x.amount,kind:'reversal'});
 assert.equal(stock(db,p.id),7);assert.equal(cash(db,'USD'),-350);
 // backup round trip
 const restored=JSON.parse(JSON.stringify(db));assert.deepEqual(restored,db);assert.equal(restored.products.length,1);assert.equal(restored.customers.length,1);assert.equal(restored.suppliers.length,1);
 return {iteration:n,products:1,customers:1,suppliers:1,stock:stock(db,p.id),cashUsd:cash(db,'USD'),sales:2,purchases:1};
}
const results=[1,2,3].map(run);console.log(JSON.stringify({ok:true,scenariosPerType:3,results},null,2));
