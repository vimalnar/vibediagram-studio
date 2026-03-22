import{r as u}from"./react-vendor-DIgwDQGH.js";import{B as F,M as U,V as T,a as l,S as D,b as m,C as p,U as j,R as E}from"./three-vendor-a0Hf22Nd.js";var z=Object.defineProperty,I=Object.defineProperties,G=Object.getOwnPropertyDescriptors,_=Object.getOwnPropertySymbols,L=Object.prototype.hasOwnProperty,B=Object.prototype.propertyIsEnumerable,g=(r,t,e)=>t in r?z(r,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):r[t]=e,x=(r,t)=>{for(var e in t||(t={}))L.call(t,e)&&g(r,e,t[e]);if(_)for(var e of _(t))B.call(t,e)&&g(r,e,t[e]);return r},N=(r,t)=>I(r,G(t)),w,A;typeof window<"u"&&((w=window.document)!=null&&w.createElement||((A=window.navigator)==null?void 0:A.product)==="ReactNative")?u.useLayoutEffect:u.useEffect;function S(r,t,e){if(!r)return;if(e(r)===!0)return r;let i=r.child;for(;i;){const s=S(i,t,e);if(s)return s;i=i.sibling}}function V(r){try{return Object.defineProperties(r,{_currentRenderer:{get(){return null},set(){}},_currentRenderer2:{get(){return null},set(){}}})}catch{return r}}const P=console.error;console.error=function(){const r=[...arguments].join("");if(r!=null&&r.startsWith("Warning:")&&r.includes("useContext")){console.error=P;return}return P.apply(this,arguments)};const y=V(u.createContext(null));class q extends u.Component{render(){return u.createElement(y.Provider,{value:this._reactInternals},this.props.children)}}function k(){const r=u.useContext(y);if(r===null)throw new Error("its-fine: useFiber must be called within a <FiberProvider />!");const t=u.useId();return u.useMemo(()=>{for(const i of[r,r==null?void 0:r.alternate]){if(!i)continue;const s=S(i,!1,n=>{let h=n.memoizedState;for(;h;){if(h.memoizedState===t)return!0;h=h.next}});if(s)return s}},[r,t])}function $(){const r=k(),[t]=u.useState(()=>new Map);t.clear();let e=r;for(;e;){if(e.type&&typeof e.type=="object"){const s=e.type._context===void 0&&e.type.Provider===e.type?e.type:e.type._context;s&&s!==y&&!t.has(s)&&t.set(s,u.useContext(V(s)))}e=e.return}return t}function ot(){const r=$();return u.useMemo(()=>Array.from(r.keys()).reduce((t,e)=>i=>u.createElement(t,null,u.createElement(e.Provider,N(x({},i),{value:r.get(e)}))),t=>u.createElement(q,x({},t))),[r])}function M(){return M=Object.assign?Object.assign.bind():function(r){for(var t=1;t<arguments.length;t++){var e=arguments[t];for(var i in e)({}).hasOwnProperty.call(e,i)&&(r[i]=e[i])}return r},M.apply(null,arguments)}var H=Object.defineProperty,Y=(r,t,e)=>t in r?H(r,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):r[t]=e,a=(r,t,e)=>(Y(r,typeof t!="symbol"?t+"":t,e),e);function c(r,t,e,i,s){let n;if(r=r.subarray||r.slice?r:r.buffer,e=e.subarray||e.slice?e:e.buffer,r=t?r.subarray?r.subarray(t,s&&t+s):r.slice(t,s&&t+s):r,e.set)e.set(r,i);else for(n=0;n<r.length;n++)e[n+i]=r[n];return e}function J(r){return r instanceof Float32Array?r:r instanceof F?r.getAttribute("position").array:r.map(t=>{const e=Array.isArray(t);return t instanceof T?[t.x,t.y,t.z]:t instanceof m?[t.x,t.y,0]:e&&t.length===3?[t[0],t[1],t[2]]:e&&t.length===2?[t[0],t[1],0]:t}).flat()}class ut extends F{constructor(){super(),a(this,"type","MeshLine"),a(this,"isMeshLine",!0),a(this,"positions",[]),a(this,"previous",[]),a(this,"next",[]),a(this,"side",[]),a(this,"width",[]),a(this,"indices_array",[]),a(this,"uvs",[]),a(this,"counters",[]),a(this,"widthCallback",null),a(this,"_attributes"),a(this,"_points",[]),a(this,"points"),a(this,"matrixWorld",new U),Object.defineProperties(this,{points:{enumerable:!0,get(){return this._points},set(t){this.setPoints(t,this.widthCallback)}}})}setMatrixWorld(t){this.matrixWorld=t}setPoints(t,e){if(t=J(t),this._points=t,this.widthCallback=e??null,this.positions=[],this.counters=[],t.length&&t[0]instanceof T)for(let i=0;i<t.length;i++){const s=t[i],n=i/(t.length-1);this.positions.push(s.x,s.y,s.z),this.positions.push(s.x,s.y,s.z),this.counters.push(n),this.counters.push(n)}else for(let i=0;i<t.length;i+=3){const s=i/(t.length-1);this.positions.push(t[i],t[i+1],t[i+2]),this.positions.push(t[i],t[i+1],t[i+2]),this.counters.push(s),this.counters.push(s)}this.process()}compareV3(t,e){const i=t*6,s=e*6;return this.positions[i]===this.positions[s]&&this.positions[i+1]===this.positions[s+1]&&this.positions[i+2]===this.positions[s+2]}copyV3(t){const e=t*6;return[this.positions[e],this.positions[e+1],this.positions[e+2]]}process(){const t=this.positions.length/6;this.previous=[],this.next=[],this.side=[],this.width=[],this.indices_array=[],this.uvs=[];let e,i;this.compareV3(0,t-1)?i=this.copyV3(t-2):i=this.copyV3(0),this.previous.push(i[0],i[1],i[2]),this.previous.push(i[0],i[1],i[2]);for(let s=0;s<t;s++){if(this.side.push(1),this.side.push(-1),this.widthCallback?e=this.widthCallback(s/(t-1)):e=1,this.width.push(e),this.width.push(e),this.uvs.push(s/(t-1),0),this.uvs.push(s/(t-1),1),s<t-1){i=this.copyV3(s),this.previous.push(i[0],i[1],i[2]),this.previous.push(i[0],i[1],i[2]);const n=s*2;this.indices_array.push(n,n+1,n+2),this.indices_array.push(n+2,n+1,n+3)}s>0&&(i=this.copyV3(s),this.next.push(i[0],i[1],i[2]),this.next.push(i[0],i[1],i[2]))}this.compareV3(t-1,0)?i=this.copyV3(1):i=this.copyV3(t-1),this.next.push(i[0],i[1],i[2]),this.next.push(i[0],i[1],i[2]),!this._attributes||this._attributes.position.count!==this.counters.length?this._attributes={position:new l(new Float32Array(this.positions),3),previous:new l(new Float32Array(this.previous),3),next:new l(new Float32Array(this.next),3),side:new l(new Float32Array(this.side),1),width:new l(new Float32Array(this.width),1),uv:new l(new Float32Array(this.uvs),2),index:new l(new Uint16Array(this.indices_array),1),counters:new l(new Float32Array(this.counters),1)}:(this._attributes.position.copyArray(new Float32Array(this.positions)),this._attributes.position.needsUpdate=!0,this._attributes.previous.copyArray(new Float32Array(this.previous)),this._attributes.previous.needsUpdate=!0,this._attributes.next.copyArray(new Float32Array(this.next)),this._attributes.next.needsUpdate=!0,this._attributes.side.copyArray(new Float32Array(this.side)),this._attributes.side.needsUpdate=!0,this._attributes.width.copyArray(new Float32Array(this.width)),this._attributes.width.needsUpdate=!0,this._attributes.uv.copyArray(new Float32Array(this.uvs)),this._attributes.uv.needsUpdate=!0,this._attributes.index.copyArray(new Uint16Array(this.indices_array)),this._attributes.index.needsUpdate=!0),this.setAttribute("position",this._attributes.position),this.setAttribute("previous",this._attributes.previous),this.setAttribute("next",this._attributes.next),this.setAttribute("side",this._attributes.side),this.setAttribute("width",this._attributes.width),this.setAttribute("uv",this._attributes.uv),this.setAttribute("counters",this._attributes.counters),this.setAttribute("position",this._attributes.position),this.setAttribute("previous",this._attributes.previous),this.setAttribute("next",this._attributes.next),this.setAttribute("side",this._attributes.side),this.setAttribute("width",this._attributes.width),this.setAttribute("uv",this._attributes.uv),this.setAttribute("counters",this._attributes.counters),this.setIndex(this._attributes.index),this.computeBoundingSphere(),this.computeBoundingBox()}advance({x:t,y:e,z:i}){const s=this._attributes.position.array,n=this._attributes.previous.array,h=this._attributes.next.array,o=s.length;c(s,0,n,0,o),c(s,6,s,0,o-6),s[o-6]=t,s[o-5]=e,s[o-4]=i,s[o-3]=t,s[o-2]=e,s[o-1]=i,c(s,6,h,0,o-6),h[o-6]=t,h[o-5]=e,h[o-4]=i,h[o-3]=t,h[o-2]=e,h[o-1]=i,this._attributes.position.needsUpdate=!0,this._attributes.previous.needsUpdate=!0,this._attributes.next.needsUpdate=!0}}const K=`
  #include <common>
  #include <logdepthbuf_pars_vertex>
  #include <fog_pars_vertex>
  #include <clipping_planes_pars_vertex>

  attribute vec3 previous;
  attribute vec3 next;
  attribute float side;
  attribute float width;
  attribute float counters;
  
  uniform vec2 resolution;
  uniform float lineWidth;
  uniform vec3 color;
  uniform float opacity;
  uniform float sizeAttenuation;
  
  varying vec2 vUV;
  varying vec4 vColor;
  varying float vCounters;
  
  vec2 fix(vec4 i, float aspect) {
    vec2 res = i.xy / i.w;
    res.x *= aspect;
    return res;
  }
  
  void main() {
    float aspect = resolution.x / resolution.y;
    vColor = vec4(color, opacity);
    vUV = uv;
    vCounters = counters;
  
    mat4 m = projectionMatrix * modelViewMatrix;
    vec4 finalPosition = m * vec4(position, 1.0) * aspect;
    vec4 prevPos = m * vec4(previous, 1.0);
    vec4 nextPos = m * vec4(next, 1.0);
  
    vec2 currentP = fix(finalPosition, aspect);
    vec2 prevP = fix(prevPos, aspect);
    vec2 nextP = fix(nextPos, aspect);
  
    float w = lineWidth * width;
  
    vec2 dir;
    if (nextP == currentP) dir = normalize(currentP - prevP);
    else if (prevP == currentP) dir = normalize(nextP - currentP);
    else {
      vec2 dir1 = normalize(currentP - prevP);
      vec2 dir2 = normalize(nextP - currentP);
      dir = normalize(dir1 + dir2);
  
      vec2 perp = vec2(-dir1.y, dir1.x);
      vec2 miter = vec2(-dir.y, dir.x);
      //w = clamp(w / dot(miter, perp), 0., 4. * lineWidth * width);
    }
  
    //vec2 normal = (cross(vec3(dir, 0.), vec3(0., 0., 1.))).xy;
    vec4 normal = vec4(-dir.y, dir.x, 0., 1.);
    normal.xy *= .5 * w;
    //normal *= projectionMatrix;
    if (sizeAttenuation == 0.) {
      normal.xy *= finalPosition.w;
      normal.xy /= (vec4(resolution, 0., 1.) * projectionMatrix).xy * aspect;
    }
  
    finalPosition.xy += normal.xy * side;
    gl_Position = finalPosition;
    #include <logdepthbuf_vertex>
    #include <fog_vertex>
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    #include <clipping_planes_vertex>
    #include <fog_vertex>
  }
`,Q=parseInt(E.replace(/\D+/g,"")),X=Q>=154?"colorspace_fragment":"encodings_fragment",Z=`
  #include <fog_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  #include <clipping_planes_pars_fragment>
  
  uniform sampler2D map;
  uniform sampler2D alphaMap;
  uniform float useGradient;
  uniform float useMap;
  uniform float useAlphaMap;
  uniform float useDash;
  uniform float dashArray;
  uniform float dashOffset;
  uniform float dashRatio;
  uniform float visibility;
  uniform float alphaTest;
  uniform vec2 repeat;
  uniform vec3 gradient[2];
  
  varying vec2 vUV;
  varying vec4 vColor;
  varying float vCounters;
  
  void main() {
    #include <logdepthbuf_fragment>
    vec4 diffuseColor = vColor;
    if (useGradient == 1.) diffuseColor = vec4(mix(gradient[0], gradient[1], vCounters), 1.0);
    if (useMap == 1.) diffuseColor *= texture2D(map, vUV * repeat);
    if (useAlphaMap == 1.) diffuseColor.a *= texture2D(alphaMap, vUV * repeat).a;
    if (diffuseColor.a < alphaTest) discard;
    if (useDash == 1.) diffuseColor.a *= ceil(mod(vCounters + dashOffset, dashArray) - (dashArray * dashRatio));
    diffuseColor.a *= step(vCounters, visibility);
    #include <clipping_planes_fragment>
    gl_FragColor = diffuseColor;     
    #include <fog_fragment>
    #include <tonemapping_fragment>
    #include <${X}>
  }
`;class ht extends D{constructor(t){super({uniforms:{...j.fog,lineWidth:{value:1},map:{value:null},useMap:{value:0},alphaMap:{value:null},useAlphaMap:{value:0},color:{value:new p(16777215)},gradient:{value:[new p(16711680),new p(65280)]},opacity:{value:1},resolution:{value:new m(1,1)},sizeAttenuation:{value:1},dashArray:{value:0},dashOffset:{value:0},dashRatio:{value:.5},useDash:{value:0},useGradient:{value:0},visibility:{value:1},alphaTest:{value:0},repeat:{value:new m(1,1)}},vertexShader:K,fragmentShader:Z}),a(this,"lineWidth"),a(this,"map"),a(this,"useMap"),a(this,"alphaMap"),a(this,"useAlphaMap"),a(this,"color"),a(this,"gradient"),a(this,"resolution"),a(this,"sizeAttenuation"),a(this,"dashArray"),a(this,"dashOffset"),a(this,"dashRatio"),a(this,"useDash"),a(this,"useGradient"),a(this,"visibility"),a(this,"repeat"),this.type="MeshLineMaterial",Object.defineProperties(this,{lineWidth:{enumerable:!0,get(){return this.uniforms.lineWidth.value},set(e){this.uniforms.lineWidth.value=e}},map:{enumerable:!0,get(){return this.uniforms.map.value},set(e){this.uniforms.map.value=e}},useMap:{enumerable:!0,get(){return this.uniforms.useMap.value},set(e){this.uniforms.useMap.value=e}},alphaMap:{enumerable:!0,get(){return this.uniforms.alphaMap.value},set(e){this.uniforms.alphaMap.value=e}},useAlphaMap:{enumerable:!0,get(){return this.uniforms.useAlphaMap.value},set(e){this.uniforms.useAlphaMap.value=e}},color:{enumerable:!0,get(){return this.uniforms.color.value},set(e){this.uniforms.color.value=e}},gradient:{enumerable:!0,get(){return this.uniforms.gradient.value},set(e){this.uniforms.gradient.value=e}},opacity:{enumerable:!0,get(){return this.uniforms.opacity.value},set(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get(){return this.uniforms.resolution.value},set(e){this.uniforms.resolution.value.copy(e)}},sizeAttenuation:{enumerable:!0,get(){return this.uniforms.sizeAttenuation.value},set(e){this.uniforms.sizeAttenuation.value=e}},dashArray:{enumerable:!0,get(){return this.uniforms.dashArray.value},set(e){this.uniforms.dashArray.value=e,this.useDash=e!==0?1:0}},dashOffset:{enumerable:!0,get(){return this.uniforms.dashOffset.value},set(e){this.uniforms.dashOffset.value=e}},dashRatio:{enumerable:!0,get(){return this.uniforms.dashRatio.value},set(e){this.uniforms.dashRatio.value=e}},useDash:{enumerable:!0,get(){return this.uniforms.useDash.value},set(e){this.uniforms.useDash.value=e}},useGradient:{enumerable:!0,get(){return this.uniforms.useGradient.value},set(e){this.uniforms.useGradient.value=e}},visibility:{enumerable:!0,get(){return this.uniforms.visibility.value},set(e){this.uniforms.visibility.value=e}},alphaTest:{enumerable:!0,get(){return this.uniforms.alphaTest.value},set(e){this.uniforms.alphaTest.value=e}},repeat:{enumerable:!0,get(){return this.uniforms.repeat.value},set(e){this.uniforms.repeat.value.copy(e)}}}),this.setValues(t)}copy(t){return super.copy(t),this.lineWidth=t.lineWidth,this.map=t.map,this.useMap=t.useMap,this.alphaMap=t.alphaMap,this.useAlphaMap=t.useAlphaMap,this.color.copy(t.color),this.gradient=t.gradient,this.opacity=t.opacity,this.resolution.copy(t.resolution),this.sizeAttenuation=t.sizeAttenuation,this.dashArray=t.dashArray,this.dashOffset=t.dashOffset,this.dashRatio=t.dashRatio,this.useDash=t.useDash,this.useGradient=t.useGradient,this.visibility=t.visibility,this.alphaTest=t.alphaTest,this.repeat.copy(t.repeat),this}}var f={exports:{}},d,C;function tt(){if(C)return d;C=1;var r="SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";return d=r,d}var v,O;function et(){if(O)return v;O=1;var r=tt();function t(){}function e(){}return e.resetWarningCache=t,v=function(){function i(h,o,it,rt,st,W){if(W!==r){var b=new Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");throw b.name="Invariant Violation",b}}i.isRequired=i;function s(){return i}var n={array:i,bigint:i,bool:i,func:i,number:i,object:i,string:i,symbol:i,any:i,arrayOf:s,element:i,elementType:i,instanceOf:s,node:i,objectOf:s,oneOf:s,oneOfType:s,shape:s,exact:s,checkPropTypes:e,resetWarningCache:t};return n.PropTypes=n,n},v}var R;function lt(){return R||(R=1,f.exports=et()()),f.exports}export{q as F,ut as M,M as _,ht as a,lt as r,ot as u};
