/**
 * @license MIT
 * Copyright (c) 2025 SGNL.ai, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
"use strict";async function e(e){const t=e.environment||{},n=e.secrets||{};if(n.BEARER_AUTH_TOKEN){const e=n.BEARER_AUTH_TOKEN;return e.startsWith("Bearer ")?e:`Bearer ${e}`}if(n.BASIC_PASSWORD&&n.BASIC_USERNAME){return`Basic ${btoa(`${n.BASIC_USERNAME}:${n.BASIC_PASSWORD}`)}`}if(n.OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN){const e=n.OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN;return e.startsWith("Bearer ")?e:`Bearer ${e}`}if(n.OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET){const e=t.OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL,r=t.OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID,a=n.OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET;if(!e||!r)throw new Error("OAuth2 Client Credentials flow requires TOKEN_URL and CLIENT_ID in env");const o=await async function(e){const{tokenUrl:t,clientId:n,clientSecret:r,scope:a,audience:o,authStyle:s}=e;if(!t||!n||!r)throw new Error("OAuth2 Client Credentials flow requires tokenUrl, clientId, and clientSecret");const i=new URLSearchParams;i.append("grant_type","client_credentials"),a&&i.append("scope",a),o&&i.append("audience",o);const c={"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"};if("InParams"===s)i.append("client_id",n),i.append("client_secret",r);else{const e=btoa(`${n}:${r}`);c.Authorization=`Basic ${e}`}const E=await fetch(t,{method:"POST",headers:c,body:i.toString()});if(!E.ok){let e;try{const t=await E.json();e=JSON.stringify(t)}catch{e=await E.text()}throw new Error(`OAuth2 token request failed: ${E.status} ${E.statusText} - ${e}`)}const l=await E.json();if(!l.access_token)throw new Error("No access_token in OAuth2 response");return l.access_token}({tokenUrl:e,clientId:r,clientSecret:a,scope:t.OAUTH2_CLIENT_CREDENTIALS_SCOPE,audience:t.OAUTH2_CLIENT_CREDENTIALS_AUDIENCE,authStyle:t.OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE});return`Bearer ${o}`}throw new Error("No authentication configured. Provide one of: BEARER_AUTH_TOKEN, BASIC_USERNAME/BASIC_PASSWORD, OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN, or OAUTH2_CLIENT_CREDENTIALS_*")}var t={invoke:async(t,n)=>{const r=function(e,t){const n=t.environment||{},r=e?.address||n.ADDRESS;if(!r)throw new Error("No URL specified. Provide address parameter or ADDRESS environment variable");return r.endsWith("/")?r.slice(0,-1):r}(t,n),a=await async function(t){return{Authorization:await e(t),Accept:"application/json","Content-Type":"application/json"}}(n);console.log(`Disabling user account: ${t.userPrincipalName}`);const o=await async function(e,t,n){const r=`${t}/v1.0/users/${encodeURIComponent(e)}`;return await fetch(r,{method:"PATCH",headers:n,body:JSON.stringify({accountEnabled:!1})})}(t.userPrincipalName,r,a);if(!o.ok){const e=await o.text();throw new Error(`Failed to disable user: ${o.status} ${o.statusText}. Details: ${e}`)}let s=!1;if(204!==o.status){s=(await o.json()).accountEnabled??!1}return console.log(`Successfully disabled user account: ${t.userPrincipalName}`),{status:"success",userPrincipalName:t.userPrincipalName,accountEnabled:s,address:r}},error:async(e,t)=>{const{error:n,userPrincipalName:r}=e;throw console.error(`User disable failed for ${r}: ${n.message}`),n},halt:async(e,t)=>{const{reason:n}=e;return console.log(`User disable operation halted: ${n}`),{status:"halted",userPrincipalName:e.userPrincipalName||"unknown",reason:n}}};module.exports=t;
