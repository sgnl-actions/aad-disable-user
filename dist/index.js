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
"use strict";const e="SGNL-CAEP-Hub/2.0";async function t(t){const n=t.environment||{},r=t.secrets||{};if(r.BEARER_AUTH_TOKEN){const e=r.BEARER_AUTH_TOKEN;return e.startsWith("Bearer ")?e:`Bearer ${e}`}if(r.BASIC_PASSWORD&&r.BASIC_USERNAME){return`Basic ${btoa(`${r.BASIC_USERNAME}:${r.BASIC_PASSWORD}`)}`}if(r.OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN){const e=r.OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN;return e.startsWith("Bearer ")?e:`Bearer ${e}`}if(r.OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET){const t=n.OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL,a=n.OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID,s=r.OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET;if(!t||!a)throw new Error("OAuth2 Client Credentials flow requires TOKEN_URL and CLIENT_ID in env");const i=await async function(t){const{tokenUrl:n,clientId:r,clientSecret:a,scope:s,audience:i,authStyle:o}=t;if(!n||!r||!a)throw new Error("OAuth2 Client Credentials flow requires tokenUrl, clientId, and clientSecret");const c=new URLSearchParams;c.append("grant_type","client_credentials"),s&&c.append("scope",s),i&&c.append("audience",i);const l={"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json","User-Agent":e};if("InParams"===o)c.append("client_id",r),c.append("client_secret",a);else{const e=btoa(`${r}:${a}`);l.Authorization=`Basic ${e}`}const u=await fetch(n,{method:"POST",headers:l,body:c.toString()});if(!u.ok){let e;try{const t=await u.json();e=JSON.stringify(t)}catch{e=await u.text()}throw new Error(`OAuth2 token request failed: ${u.status} ${u.statusText} - ${e}`)}const E=await u.json();if(!E.access_token)throw new Error("No access_token in OAuth2 response");return E.access_token}({tokenUrl:t,clientId:a,clientSecret:s,scope:n.OAUTH2_CLIENT_CREDENTIALS_SCOPE,audience:n.OAUTH2_CLIENT_CREDENTIALS_AUDIENCE,authStyle:n.OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE});return`Bearer ${i}`}return""}var n={invoke:async(n,r)=>{const a=function(e,t){const n=t.environment||{},r=e?.address||n.ADDRESS;if(!r)throw new Error("No URL specified. Provide address parameter or ADDRESS environment variable");return r.endsWith("/")?r.slice(0,-1):r}(n,r),s=await async function(n){const r=await t(n),a={Accept:"application/json","Content-Type":"application/json","User-Agent":e};return r&&(a.Authorization=r),a}(r);if(!n.userPrincipalName||"string"!=typeof n.userPrincipalName||!n.userPrincipalName.trim())throw new Error("userPrincipalName parameter is required and cannot be empty");console.log(`Disabling user account: ${n.userPrincipalName}`);const i=await async function(e,t,n){const r=`${t}/v1.0/users/${encodeURIComponent(e)}`;return await fetch(r,{method:"PATCH",headers:n,body:JSON.stringify({accountEnabled:!1})})}(n.userPrincipalName,a,s);if(!i.ok){const e=await i.text();throw new Error(`Failed to disable user: ${i.status} ${i.statusText}. Details: ${e}`)}let o=!1;if(204!==i.status){o=(await i.json()).accountEnabled??!1}return console.log(`Successfully disabled user account: ${n.userPrincipalName}`),{status:"success",userPrincipalName:n.userPrincipalName,accountEnabled:o,address:a}},error:async(e,t)=>{const{error:n,userPrincipalName:r}=e;throw console.error(`User disable failed for ${r}: ${n.message}`),n},halt:async(e,t)=>{const{reason:n}=e;return console.log(`User disable operation halted: ${n}`),{status:"halted",userPrincipalName:e.userPrincipalName||"unknown",reason:n}}};module.exports=n;
