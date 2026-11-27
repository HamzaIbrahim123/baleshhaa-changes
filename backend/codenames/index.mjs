import pg from 'pg';
import {attachDatabasePool} from '@neon/functions';
import {createPgStore} from './db.mjs';
import {createHandler} from './service.mjs';
let handler;
export default {async fetch(request){try{if(!handler){const {DATABASE_URL,CN_ALLOWED_ORIGINS,CN_IP_PEPPER}=process.env;if(!DATABASE_URL||!CN_ALLOWED_ORIGINS||!CN_IP_PEPPER||CN_IP_PEPPER.length<24)throw new Error('Configuration incomplete');const pool=new pg.Pool({connectionString:DATABASE_URL,max:5,idleTimeoutMillis:30000,connectionTimeoutMillis:7000});attachDatabasePool(pool);handler=createHandler(createPgStore(pool),{corsOrigins:CN_ALLOWED_ORIGINS,ipPepper:CN_IP_PEPPER});}return await handler.fetch(request);}catch{return new Response(JSON.stringify({error:{code:'SERVICE_UNAVAILABLE'}}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});}}};
