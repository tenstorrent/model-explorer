var Q=4,ie=4,D=9,le=16,ce=200,q=12,pe=1e3;var j=25;var ue=.1;var M="Node data provider: ",R=10;var k="__value",z="__tensor_tag",P=20;var H=14;var be=new OffscreenCanvas(300,300),he={},yt=typeof navigator<"u"&&/Macintosh/.test(navigator.userAgent);function y(n){return n?.nodeType===0}function N(n){return n?.nodeType===1}function Z(n){let e=[];for(let[o,t]of Object.entries(n))switch(o){case"Op node id":t.selected&&e.push("id");break;default:break}return e}function J(n){let e=[];for(let[o,t]of Object.entries(n))switch(o){case"Layer node children count":t.selected&&e.push("#children");break;case"Layer node descendants count":t.selected&&e.push("#descendants");break;default:break}return e}function ee(n,e){if(y(n))switch(e.toLowerCase()){case"id":return n.id;case"namespace":return ge(n);default:break}else if(N(n))switch(e.toLowerCase()){case"namespace":return ge(n);case"#children":return String((n.nsChildrenIds||[]).length);case"#descendants":return String((n.descendantsNodeIds||[]).length);default:break}return""}function ge(n){return n.fullNamespace||n.namespace||"<root>"}function A(n,e,o,t=!1){let r=[];n==null?r=e.rootNodes.map(s=>s.id):r=n.nsChildrenIds||[];for(let s of r){let d=e.nodesById[s];if(d&&N(d)&&(t||!t&&d.expanded)){let a=d.nsChildrenIds||[];(t?a.filter(i=>N(e.nodesById[i])).length===0:a.filter(i=>N(e.nodesById[i])).every(i=>!e.nodesById[i].expanded))&&o.push(d.id),A(d,e,o,t)}}}function fe(n,e,o,t){let r=[];if(n.length===2)r=n;else if(n.length===3&&n[0].x===n[1].x&&n[1].x===n[2].x)r=n;else{let s=!0,d=0;for(let l=0;l<n.length-1;l++){let i=n[l],g=n[l+1]>i?1:-1;if(d!==0&&d!==g){s=!1;break}d=g}let a=t.Vector3;if(s){let i=e().x(p=>p.x).y(p=>p.y).curve(o)(n).split(/M|C/).filter(p=>p!=="").map(p=>p.split(",").map(h=>Number(h))),c=new a(i[0][0],i[0][1],0),g=new t.CurvePath;for(let p=1;p<i.length;p++){let h=i[p];if(h.length===6){let m=c,I=new a(h[0],h[1]),u=new a(h[2],h[3]),E=new a(h[4],h[5]);c=E;let _=new t.CubicBezierCurve3(m,I,u,E);g.add(_)}}r=g.getPoints(j)}else{let l=n.map(c=>new a(c.x,c.y,0));r=new t.CatmullRomCurve3(l,!1,"catmullrom",ue).getPoints(j)}}return r}function G(n,e,o,t=!0){let r=`${n}___${e}___${o}`,s=he[r];if(s==null){let d=be.getContext("2d");d.font=`${e}px "Google Sans Text", Arial, Helvetica, sans-serif`,o&&(d.font=`bold ${d.font}`);let l=d.measureText(n).width;t&&(he[r]=l),s=l}return s}function De(n,e,o){let t=o[z];return t?`Input${n}:${t} (${e.label})`:`Input${n} (${e.label})`}function Le(n,e,o){let t=`Output${n}`;if(o.label==="GraphInputs"){let r=e.tensor_name;r!=null&&(t=`${t} (${r})`)}else{let r=e[z];r&&(t=`Output${n}:${r}`)}return t}function Ne(n){let e=((n||{}).shape||"").replace(/ /g,"").replace(/×/g,"x");return e===""&&(e="?"),e}function te(n,e=""){let o=n.attrs||{},t=[],r=new RegExp(e,"i");for(let s of Object.keys(o)){let d=s,a=o[s],l=[`${d}:${a}`,`${d}=${a}`];if(e.trim()===""||l.some(i=>r.test(i))){let i=a;d===k?i=a.replace(/\s/gm,""):i=a.replace(/(\r\n|\n|\r)/gm," "),t.push({key:d,value:i})}}return t}function oe(n,e,o=""){let t=e.groupNodeAttributes?.[n.id.replace("___group___","")]||{},r=[],s=new RegExp(o,"i");for(let d of Object.keys(t)){let a=d,l=t[d],i=[`${a}:${l}`,`${a}=${l}`];if(o.trim()===""||i.some(c=>s.test(c))){let c=l.replace(/(\r\n|\n|\r)/gm," ");r.push({key:a,value:c})}}return r}function me(n,e){let o=n.incomingEdges||[],t=[];for(let r=0;r<Math.min(R,o.length);r++){let s=o[r],d=s.sourceNodeId,a=e.nodesById[d],l=Ne((a.outputsMetadata||{})[s.sourceNodeOutputId]),i=(n.inputsMetadata||{})[s.targetNodeInputId]||{};t.push({key:De(r,a,i),value:l})}if(o.length>R){let r=o.length-R;t.push({key:`(${r} more input${r===1?"":"s"} omitted)`,value:"..."})}return t}function Ee(n){let e=[],o=n.outputsMetadata||{},t=Object.values(o);for(let r=0;r<Math.min(R,t.length);r++){let s=t[r],d=Ne(s);e.push({key:Le(r,s,n),value:d})}if(t.length>R){let r=t.length-R;e.push({key:`(${r} more output${r===1?"":"s"} omitted)`,value:"..."})}return e}function Ie(n,e,o,t){let r=[],s=Object.keys(o).filter(a=>o[a].selected).filter(a=>a.startsWith(M)).map(a=>a.replace(M,"")),d=Object.values(t).filter(a=>s.includes(a.runName));for(let a of d){let l=(a.results||{})?.[e][n.id]?.strValue||"-";r.push({key:a.runName,value:l})}return r}function _e(n,e){let o=n.split("/"),t=e.split("/"),r="";for(let s=Math.min(o.length,t.length);s>0;s--){let d=o.slice(0,s).join("/"),a=t.slice(0,s).join("/");if(d===a){r=a;break}}return r}function re(n,e){if(n===e)return"";let o=n.split("/").filter(r=>r!==""),t=e.split("/").filter(r=>r!=="");return t.length===0?"":t[o.length]}function w(n){return n.split(`
`).map(e=>e.trim()).filter(e=>e!=="")}function Y(n){return(w(n).length-1)*H}var ne=36,Te=16,ye=26,Se=50,Me=24,ve=80,Ce=8,T=class{constructor(e,o,t,r,s=!1){this.modelGraph=e;this.dagre=o;this.showOnNodeItemTypes=t;this.nodeDataProviderRuns=r;this.testMode=s;this.dagreGraph=new this.dagre.graphlib.Graph}dagreGraph;layout(e){let o,t=[];e==null?t=this.modelGraph.rootNodes:(o=this.modelGraph.nodesById[e],t=(o.nsChildrenIds||[]).map(u=>this.modelGraph.nodesById[u])),this.configLayout(this.dagreGraph);let r=ae(o?.id||"",t,this.modelGraph,this.showOnNodeItemTypes,this.nodeDataProviderRuns,this.testMode);for(let u of Object.keys(r.nodes)){let E=r.nodes[u];E.config?.pinToGroupTop||this.dagreGraph.setNode(u,E)}for(let u of Object.keys(r.outgoingEdges))for(let E of r.outgoingEdges[u])this.dagreGraph.setEdge(u,E);this.dagre.layout(this.dagreGraph);let s=Number.MAX_VALUE,d=Number.MAX_VALUE,a=Number.NEGATIVE_INFINITY,l=Number.NEGATIVE_INFINITY;for(let u of t){let E=r.nodes[u.id];if(!E){console.warn(`Node "${u.id}" is not in the dagre layout result`);continue}u.x=(E.x||0)-E.width/2,u.y=(E.y||0)-E.height/2,u.width=E.width,u.height=E.height,u.localOffsetX=0,u.localOffsetY=0,E.config?.pinToGroupTop||(s=Math.min(s,u.x),d=Math.min(d,u.y),a=Math.max(a,u.x+u.width),l=Math.max(l,u.y+u.height))}let i=Number.MAX_VALUE,c=Number.MAX_VALUE,g=Number.NEGATIVE_INFINITY,p=Number.NEGATIVE_INFINITY,h=this.dagreGraph.edges(),m=[];for(let u of h){let E=this.dagreGraph.edge(u).points,_=globalThis.d3,v=globalThis.THREE,V=typeof v>"u"?[]:fe(E,_.line,_.curveMonotoneY,v),f=this.modelGraph.nodesById[u.v],b=this.modelGraph.nodesById[u.w];if(f==null){console.warn(`Edge from node not found: "${u.v}"`);continue}if(b==null){console.warn(`Edge to node not found: "${u.w}"`);continue}let C=`${f.id}|${b.id}`;m.push({id:C,fromNodeId:f.id,toNodeId:b.id,points:E,curvePoints:V});for(let O of E)i=Math.min(i,O.x),c=Math.min(c,O.y),g=Math.max(g,O.x),p=Math.max(p,O.y)}if(this.modelGraph.edgesByGroupNodeIds[e||""]=m,i<s)for(let u of t)u.localOffsetX=Math.max(0,s-i);s=Math.min(i,s),a=Math.max(g,a);let I=a-s+P*2;if(o){let u=$(o,this.modelGraph,this.showOnNodeItemTypes,this.nodeDataProviderRuns);if(I<u){let E=(u-I)/2;for(let _ of t)_.localOffsetX||(_.localOffsetX=0),_.localOffsetX+=E;I=u}}if(o&&N(o)){let u=Re(o,this.modelGraph,this.showOnNodeItemTypes);if(u>0){let E=u*q+16;for(let _ of t)_.localOffsetY=E;l+=E}}return{x:s,y:d,width:I-P*2,height:l-d}}configLayout(e){e.setGraph({nodesep:20,ranksep:50,edgesep:20,marginx:P,marginy:ne}),e.setDefaultEdgeLabel(()=>({}))}};function $(n,e,o,t,r=!1){if(r)return Se;let s=n.label,d=w(s),a=0;for(let g of d)a=Math.max(G(g,11,N(n))+Me,a);N(n)&&(a+=28);let l=0,i=0;if(y(n)){let g=Z(o);for(let m of g){let I=G(`${m}:`,D,!0),u=ee(n,m),E=G(u,D,!1);l=Math.max(l,I),i=Math.max(i,E)}if(o["Op node attributes"]?.selected){let m=te(n,o["Op node attributes"]?.filterRegex||""),I=B(m);l=Math.max(l,I.maxAttrLabelWidth),i=Math.max(i,I.maxAttrValueWidth)}if(o["Op node inputs"]?.selected){let m=me(n,e),I=B(m);l=Math.max(l,I.maxAttrLabelWidth),i=Math.max(i,I.maxAttrValueWidth)}if(o["Op node outputs"]?.selected){let m=Ee(n),I=B(m);l=Math.max(l,I.maxAttrLabelWidth),i=Math.max(i,I.maxAttrValueWidth)}let p=Ie(n,e.id,o,t),h=B(p);l=Math.max(l,h.maxAttrLabelWidth),i=Math.max(i,h.maxAttrValueWidth)}else if(N(n)){let g=J(o);for(let p of g){let h=G(`${p}:`,D,!0),m=ee(n,p),I=G(m,D,!1);l=Math.max(l,h),i=Math.max(i,I)}if(o["Layer node attributes"]?.selected){let p=oe(n,e,o["Layer node attributes"]?.filterRegex||""),h=B(p);l=Math.max(l,h.maxAttrLabelWidth),i=Math.max(i,h.maxAttrValueWidth)}}i=Math.min(i,ce);let c=l+i+ie*2+Q;return c!==Q&&(c+=Ce*2),Math.max(ve,Math.max(a,c))}function se(n,e,o,t,r=!1,s=!1){if(r)return ye;if(n.height!=null&&!s)return n.height;let d=Y(n.label),a=0;return y(n)?a=we(o,n,t):N(n)&&(a=Re(n,e,o)),ye+d+a*q+(a>0?le-4:0)}function ae(n,e,o,t,r,s=!1,d=!1){let a={nodes:{},incomingEdges:{},outgoingEdges:{}};for(let i of e){if(y(i)&&i.hideInLayout)continue;let c={id:i.id,width:i.width||(d?10:$(i,o,t,r,s)),height:d?10:se(i,o,t,r,s),config:y(i)?i.config:void 0};a.nodes[i.id]=c}let l=o.layoutGraphEdges[n]||{};for(let[i,c]of Object.entries(l))for(let g of Object.keys(c)){let p=o.nodesById[i],h=o.nodesById[g];p&&y(p)&&p.config?.pinToGroupTop||h&&y(h)&&h.config?.pinToGroupTop||Be(a,i,g)}return a}function we(n,e,o){let t=Z(n),r=n["Op node attributes"]?.selected?te(e,n["Op node attributes"]?.filterRegex||"").length:0,s=n["Op node inputs"]?.selected?Object.keys(e.incomingEdges||[]).length:0;s>R&&(s=R+1);let d=n["Op node outputs"]?.selected?Object.keys(e.outputsMetadata||{}).length:0;d>R&&(d=R+1);let a=Object.keys(n).filter(l=>n[l].selected).filter(l=>l.startsWith(M)&&Object.values(o).some(i=>i.runName===l.replace(M,""))).length;return t.length+r+s+d+a}function Re(n,e,o){let t=J(o),r=o["Layer node attributes"]?.selected?oe(n,e,o["Layer node attributes"]?.filterRegex||"").length:0;return t.length+r}function Be(n,e,o){n.outgoingEdges[e]==null&&(n.outgoingEdges[e]=[]),n.outgoingEdges[e].push(o),n.incomingEdges[o]==null&&(n.incomingEdges[o]=[]),n.incomingEdges[o].push(e)}function B(n){let e=0,o=0;for(let{key:t,value:r}of n){let s=G(t,D,!0);e=Math.max(e,s);let d=G(r,D,!1);o=Math.max(o,d)}return{maxAttrLabelWidth:e,maxAttrValueWidth:o}}var L=class{constructor(e,o,t,r,s=!1){this.modelGraph=e;this.dagre=o;this.showOnNodeItemTypes=t;this.nodeDataProviderRuns=r;this.testMode=s}dagreGraphs=[];expandGroupNode(e){let o=this.modelGraph.nodesById[e];if(o&&N(o)){if(o.expanded)return;o.expanded=!0}let t=e;for(;t!=null;){let s=this.modelGraph.nodesById[t];if(!s)break;s.expanded=!0;let d=new T(this.modelGraph,this.dagre,this.showOnNodeItemTypes,this.nodeDataProviderRuns),a=d.layout(t);this.testMode&&this.dagreGraphs.push(d.dagreGraph);let l=a.width+P*2,i=this.getTargetGroupNodeHeight(a,s);s.width=l,s.height=i,t=s.nsParentId}let r=new T(this.modelGraph,this.dagre,this.showOnNodeItemTypes,this.nodeDataProviderRuns);r.layout(),this.testMode&&this.dagreGraphs.push(r.dagreGraph);for(let s of this.modelGraph.rootNodes)N(s)&&this.updateNodeOffset(s)}expandFromDeepestGroupNodes(e){let o=new Set,t=[...e];for(;t.length>0;){let d=t.shift();if(o.has(d))continue;o.add(d);let l=this.modelGraph.nodesById[d]?.nsParentId;l&&t.push(l)}let r=Array.from(o).sort((d,a)=>{let l=this.modelGraph.nodesById[d];return this.modelGraph.nodesById[a].level-l.level});for(let d of r){let a=this.modelGraph.nodesById[d];a.expanded=!0;let l=new T(this.modelGraph,this.dagre,this.showOnNodeItemTypes,this.nodeDataProviderRuns),i=l.layout(d);this.testMode&&this.dagreGraphs.push(l.dagreGraph);let c=i.width+P*2,g=this.getTargetGroupNodeHeight(i,a);a.width=c,a.height=g}let s=new T(this.modelGraph,this.dagre,this.showOnNodeItemTypes,this.nodeDataProviderRuns);s.layout(),this.testMode&&this.dagreGraphs.push(s.dagreGraph);for(let d of this.modelGraph.rootNodes)N(d)&&this.updateNodeOffset(d)}expandToRevealNode(e){let o=this.modelGraph.nodesById[e],t=[],r=o;for(;;){let d=this.modelGraph.nodesById[r.nsParentId||""];if(!d)break;t.unshift(d),r=d}for(let d of t)this.expandGroupNode(d.id);let s=[];return A(void 0,this.modelGraph,s),s}collapseGroupNode(e){let o=this.modelGraph.nodesById[e];if(!o)return[];o.expanded=!1,delete this.modelGraph.edgesByGroupNodeIds[e],o.width=$(o,this.modelGraph,this.showOnNodeItemTypes,this.nodeDataProviderRuns),o.height=se(o,this.modelGraph,this.showOnNodeItemTypes,this.nodeDataProviderRuns,this.testMode,!0);let t=o.nsParentId;for(;t!=null;){let d=this.modelGraph.nodesById[t];if(!d)break;let a=new T(this.modelGraph,this.dagre,this.showOnNodeItemTypes,this.nodeDataProviderRuns),l=a.layout(t);this.testMode&&this.dagreGraphs.push(a.dagreGraph);let i=l.width+P*2,c=this.getTargetGroupNodeHeight(l,d);d.width=i,d.height=c,t=d.nsParentId}let r=new T(this.modelGraph,this.dagre,this.showOnNodeItemTypes,this.nodeDataProviderRuns);r.layout(),this.testMode&&this.dagreGraphs.push(r.dagreGraph);for(let d of this.modelGraph.rootNodes)N(d)&&this.updateNodeOffset(d);let s=[];return A(void 0,this.modelGraph,s),s}reLayoutGraph(e,o){let t=e;if(t)o&&this.clearLayoutData(void 0,!0);else{let r=[];this.clearLayoutData(void 0),A(void 0,this.modelGraph,r),t=r}return t.length>0?this.expandFromDeepestGroupNodes(t):new T(this.modelGraph,this.dagre,this.showOnNodeItemTypes,this.nodeDataProviderRuns).layout(),t}expandAllGroups(){this.clearLayoutData(void 0,!0);let e=this.modelGraph.nodes.filter(o=>N(o)&&(o.nsChildrenIds||[]).filter(t=>N(this.modelGraph.nodesById[t])).length===0).map(o=>o.id);return e.length>0&&this.expandFromDeepestGroupNodes(e),e}collapseAllGroup(){this.clearLayoutData(void 0,!0),new T(this.modelGraph,this.dagre,this.showOnNodeItemTypes,this.nodeDataProviderRuns).layout();for(let o of this.modelGraph.rootNodes)N(o)&&this.updateNodeOffset(o);return[]}updateNodeOffset(e){for(let o of e.nsChildrenIds||[]){let t=this.modelGraph.nodesById[o];if(t.x!=null&&t.y!=null){t.globalX=(e.x||0)+(e.globalX||0)+(t.localOffsetX||0),t.globalY=(e.y||0)+(e.globalY||0)+(t.localOffsetY||0);let r=(w(e.label).length-1)*H;r>0&&(t.globalY+=r),e.pinToTopOpNode&&t.id!==e.pinToTopOpNode.id&&(t.globalY+=this.getPinToTopNodeVerticalSpace(e.pinToTopOpNode)),e.pinToTopOpNode?.id===t.id&&(t.globalX=(e.x||0)+(e.globalX||0)+(e.width||0)/2,t.globalY=(e.y||0)+(e.globalY||0)+(t.localOffsetY||0)+this.getPinToTopNodeVerticalSpace(t)-(t.height||0)/2+10)}N(t)&&this.updateNodeOffset(t)}}clearLayoutData(e,o){let t=[];e==null?t=this.modelGraph.rootNodes.map(r=>r.id):t=e.nsChildrenIds||[],o&&e!=null&&(e.expanded=!1,delete this.modelGraph.edgesByGroupNodeIds[e.id]);for(let r of t){let s=this.modelGraph.nodesById[r];s&&(s.width=void 0,s.height=void 0,N(s)&&s.expanded&&this.clearLayoutData(s,o))}}getPinToTopNodeVerticalSpace(e){return(e.height||0)+20}getTargetGroupNodeHeight(e,o){let t=Y(o.label),r=e.height+ne+Te+t;return o.pinToTopOpNode&&(r+=this.getPinToTopNodeVerticalSpace(o.pinToTopOpNode)),r}};function x(n,e,o){let t={eventType:8,paneId:n,label:e,error:o};postMessage(t)}var ke=/dense<([^>]*)>/,F=class{constructor(e,o,t,r={},s={},d=pe,a=!1,l=!1,i=!1){this.paneId=e;this.graph=o;this.config=t;this.showOnNodeItemTypes=r;this.nodeDataProviderRuns=s;this.groupNodeChildrenCountThreshold=d;this.testMode=a;this.flattenLayers=l;this.keepLayersWithASingleChild=i;this.nodeLabelsToHide=new Set((this.config?.nodeLabelsToHide||[]).map(c=>c.toLowerCase()))}nodeLabelsToHide;process(){let e=this.createEmptyModelGraph();return this.processNodes(e),this.processEdgeRelationships(e),x(this.paneId,"Processing nodes and edges"),this.processNamespaceRelationships(e),x(this.paneId,"Processing layer namespaces"),this.generateLayoutGraphConnections(e),x(this.paneId,"Processing layout data"),this.splitLargeGroupNodes(e),x(this.paneId,"Splitting large layers (if any)"),this.populateDescendantsAndCounts(e),e}processNodes(e){let o=new Set;for(let t of this.graph.nodes){let s=t.namespace.split(";").filter(a=>a!=="");s.length>1&&(t.namespace=s[s.length-1]);let d={nodeType:0,id:t.id,namespace:this.flattenLayers?"":t.namespace,savedNamespace:t.namespace,fullNamespace:t.namespace,label:t.label,level:this.getNonEmptyNamespaceComponents(t.namespace).length};if(t.subgraphIds&&t.subgraphIds.length>0&&(d.subgraphIds=t.subgraphIds),this.nodeLabelsToHide.has(t.label.toLowerCase())&&(d.hideInLayout=!0),t.attrs){let a={};for(let l of t.attrs)a[l.key]=this.processAttrValue(l.key,l.value);d.attrs=a}if(t.inputsMetadata&&(d.inputsMetadata=this.processMetadataList(t.inputsMetadata)),t.outputsMetadata&&(d.outputsMetadata=this.processMetadataList(t.outputsMetadata)),t.style&&(d.style=t.style),t.config&&(d.config=t.config),e.nodes.push(d),e.nodesById[d.id]=d,!d.hideInLayout&&!this.flattenLayers){let a=this.getAncestorNamespaces(d.namespace);for(let l of a){if(o.has(l))continue;o.add(l);let i=l.split("/"),c=i.splice(-1)[0],g=i.join("/"),p={nodeType:1,id:this.getGroupNodeIdFromNamespace(l),namespace:g,label:c,level:i.length,expanded:!1};e.nodes.push(p),e.nodesById[p.id]=p}}}}processEdgeRelationships(e){for(let o of this.graph.nodes){let t=e.nodesById[o.id];if(t)for(let r of o.incomingEdges||[]){let s=r.sourceNodeId,d=e.nodesById[s];d&&(t.incomingEdges==null&&(t.incomingEdges=[]),t.incomingEdges.find(a=>a.sourceNodeId===s&&a.sourceNodeOutputId===r.sourceNodeOutputId&&a.targetNodeInputId===r.targetNodeInputId)==null&&t.incomingEdges.push({...r}),d.outgoingEdges==null&&(d.outgoingEdges=[]),d.outgoingEdges.find(a=>a.targetNodeId===t.id&&a.sourceNodeOutputId===r.sourceNodeOutputId&&a.targetNodeInputId===r.targetNodeInputId)==null&&d.outgoingEdges.push({targetNodeId:t.id,sourceNodeOutputId:r.sourceNodeOutputId,targetNodeInputId:r.targetNodeInputId}))}}}processNamespaceRelationships(e){for(let o of e.nodes){if(y(o)&&o.hideInLayout)continue;let t=o.namespace;if(t===""){e.rootNodes.push(o);continue}let r=this.getGroupNodeIdFromNamespace(t),s=e.nodesById[r];s?o.nsParentId=s.id:console.warn(`Failed to find the NS parent of node "${o.id}": "${r}"`),s&&(s.nsChildrenIds==null&&(s.nsChildrenIds=[]),s.nsChildrenIds.includes(o.id)||(s.nsChildrenIds.push(o.id),y(o)&&o.config?.pinToGroupTop&&(s.pinToTopOpNode=o)))}if(!this.keepLayersWithASingleChild)for(;;){let o=0;for(let t of e.nodes)if(N(t)&&t.nsChildrenIds!=null&&t.nsChildrenIds.length===1){let r=e.nodesById[t.nsChildrenIds[0]];if(y(r)){o++;let s=e.nodes.indexOf(t);s>=0&&e.nodes.splice(s,1),delete e.nodesById[t.id];let d=r.namespace,a=this.getNonEmptyNamespaceComponents(d);a.pop(),r.namespace=a.join("/"),r.savedNamespace=r.namespace,r.level=a.length,r.nsParentId=t.nsParentId;let l=e.rootNodes.indexOf(t);if(l>=0&&(e.rootNodes.splice(l,1),e.rootNodes.push(r)),t.nsParentId){let i=e.nodesById[t.nsParentId],c=i.nsChildrenIds.indexOf(t.id);i.nsChildrenIds.splice(c,1),i.nsChildrenIds.push(r.id)}}}if(o===0)break}}generateLayoutGraphConnections(e){e.layoutGraphEdges={};let o=[];for(let s of e.nodes){if(!y(s)||s.hideInLayout)continue;(s.incomingEdges||[]).filter(a=>!e.nodesById[a.sourceNodeId].hideInLayout).length===0&&o.push(s)}let t=[...o],r=new Set;for(;t.length>0;){let s=t.shift();if(s==null||s.hideInLayout||r.has(s.id))continue;r.add(s.id);let d=s.outgoingEdges||[];for(let a of d){let l=e.nodesById[a.targetNodeId];if(l.hideInLayout)continue;let i=_e(s.namespace,l.namespace),c=re(i,s.namespace),g=c===""?s.id:`${i}${i===""?"":"/"}${c}___group___`,p=re(i,l.namespace),h=p===""?l.id:`${i}${i===""?"":"/"}${p}___group___`,m=i===""?"":`${i}___group___`;e.layoutGraphEdges[m]==null&&(e.layoutGraphEdges[m]={}),e.layoutGraphEdges[m][g]==null&&(e.layoutGraphEdges[m][g]={}),e.layoutGraphEdges[m][g][h]=!0}for(let a of d){let l=e.nodesById[a.targetNodeId];t.push(l)}}}splitLargeGroupNodes(e){let o=[void 0],t=!1;for(;o.length>0;){let r=o.shift(),s=r==null?e.rootNodes:(r.nsChildrenIds||[]).map(d=>e.nodesById[d]);if(s.length>this.groupNodeChildrenCountThreshold){t=!0;let d=ae(r?.id||"",s,e,this.showOnNodeItemTypes,this.nodeDataProviderRuns,this.testMode,!0),a=[];for(let h of Object.keys(d.nodes))d.incomingEdges[h]==null&&a.push(e.nodesById[h]);let l=[],i=[],c=new Set,g=h=>{if(c.has(h))return;c.add(h);let m=e.nodesById[h];i.push(m),i.length===this.groupNodeChildrenCountThreshold&&(l.push(i),i=[]);for(let I of d.outgoingEdges[m.id]||[])g(I)};for(let h of a)g(h.id);i.length<this.groupNodeChildrenCountThreshold&&i.length>0&&l.push(i);let p=[];for(let h=0;h<l.length;h++){let m=l[h],I=r==null?"":`${r.namespace}/${r.label}`,u=`section_${h+1}_of_${l.length}`,E=r==null?`${u}___group___`:`${I}/${u}___group___`,_={nodeType:1,id:E,label:u,namespace:I,level:I.split("/").filter(f=>f!=="").length,nsParentId:r?.id,nsChildrenIds:m.map(f=>f.id),expanded:!1,sectionContainer:!0};p.push(_),e.nodes.push(_),e.nodesById[_.id]=_,e.artificialGroupNodeIds==null&&(e.artificialGroupNodeIds=[]),e.artificialGroupNodeIds.push(_.id);for(let f of m)f.nsParentId=_.id;let v=E.replace("___group___",""),V=f=>{if(f.namespace===""?f.namespace=v:r==null?f.namespace=`${v}/${f.namespace}`:f.namespace=(f.nsParentId||"").replace("___group___",""),f.level=f.namespace.split("/").filter(C=>C!=="").length,N(f)){let C=f.id;if(delete e.nodesById[f.id],f.id=`${f.namespace}/${f.label}___group___`,e.nodesById[f.id]=f,f.nsParentId){let O=e.nodesById[f.nsParentId],S=(O.nsChildrenIds||[]).indexOf(C);S>=0&&((O.nsChildrenIds||[])[S]=f.id)}for(let O of f.nsChildrenIds||[]){let S=e.nodesById[O];S!=null&&(S.nsParentId=f.id,V(S))}}};for(let f of m)V(f);if(r==null){for(let f of m){let b=e.rootNodes.indexOf(f);b>=0&&e.rootNodes.splice(b,1)}_.namespace===""&&e.rootNodes.push(_)}s=p}r!=null&&(r.nsChildrenIds=p.map(h=>h.id))}for(let d of s)N(d)&&o.push(d)}t&&this.generateLayoutGraphConnections(e)}populateDescendantsAndCounts(e){let o=Number.MAX_VALUE,t=Number.NEGATIVE_INFINITY;for(let r of e.nodes)if(N(r)){let s=[];this.gatherDescendants(e,r,s),r.descendantsNodeIds=s.map(a=>a.id),r.descendantsOpNodeIds=s.filter(a=>a.nodeType===0).map(a=>a.id);let d=(r.descendantsOpNodeIds||[]).length;o=Math.min(d,o),t=Math.max(d,t)}e.minDescendantOpNodeCount=o,e.maxDescendantOpNodeCount=t}createEmptyModelGraph(){let e={id:this.graph.id,collectionLabel:this.graph.collectionLabel||"",nodes:[],nodesById:{},rootNodes:[],edgesByGroupNodeIds:{},layoutGraphEdges:{},minDescendantOpNodeCount:-1,maxDescendantOpNodeCount:-1};return this.graph.groupNodeAttributes&&(e.groupNodeAttributes=this.graph.groupNodeAttributes),e}getAncestorNamespaces(e){let o=this.getNonEmptyNamespaceComponents(e),t=[];for(;o.length>0;)t.push(o.join("/")),o.pop();return t}getNonEmptyNamespaceComponents(e){return e.split("/").filter(o=>o!=="")}getGroupNodeIdFromNamespace(e){return`${e}___group___`}gatherDescendants(e,o,t){for(let r of o.nsChildrenIds||[]){let s=e.nodesById[r];(N(s)||y(s)&&!s.hideInLayout)&&t.push(s),N(s)&&this.gatherDescendants(e,s,t)}}processAttrValue(e,o){if(o.startsWith("dense<")){let t=o.match(ke);if(t!=null&&t.length>1){let r=t[1];return Oe(r)}}else if(e===k)return Oe(o);return o.replaceAll('"',"")||"<empty>"}processMetadataList(e){let o={};for(let t of e){let r={};for(let s of t.attrs){let d=s.key,a=s.value;d==="tensor_shape"&&(d="shape",a=a.replace("tensor<","").replace(">","").replace("*","\u2217").split("x").join(" x ")),r[d]=a}o[t.id]=r}return o}};function Oe(n){try{return JSON.stringify(JSON.parse(n),null,2).replaceAll("\\n",`
`).trim()}catch{return n}}var W=10000019,X=class{constructor(e){this.modelGraph=e}markIdenticalGroups(){let e={};for(let t of this.modelGraph.nodes){if(!N(t))continue;let r=0,s=(t.descendantsOpNodeIds||[]).map(a=>this.modelGraph.nodesById[a]).filter(a=>!a.hideInLayout),d=new Set(s.map(a=>a.id));for(let a of s)r=(r+this.getNodeHash(a,d))%W;for(let a of s)for(let l of a.outgoingEdges||[]){let i=l.targetNodeId;if(!d.has(i))continue;let c=this.modelGraph.nodesById[i];r=(r+this.getEdgeHash(a,c))%W}e[r]||(e[r]=[]),e[r].push(t)}let o=0;for(let t of Object.values(e))if(!(t.length<=1)&&!(t.length===2&&(t[0].nsParentId===t[1].id||t[1].nsParentId===t[0].id))){for(let r of t)r.identicalGroupIndex=o;o++}}getNodeHash(e,o){let t=0;t=this.addToHash(t,e.label);let r=0;for(let d of e.incomingEdges||[]){let a=d.sourceNodeId;if(o.has(a)){let l=this.modelGraph.nodesById[a];t=this.addToHash(t,`in ${l.label}`),r++}}let s=0;for(let d of e.outgoingEdges||[]){let a=d.targetNodeInputId;if(o.has(a)){let l=this.modelGraph.nodesById[a];t=this.addToHash(t,`out ${l.label}`),s++}}return t=this.addToHash(t,`${r}`),t=this.addToHash(t,`${s}`),t}getEdgeHash(e,o){return this.genHash(e.label+o.label)%W}genHash(e){let o=5381;e=e||"";for(let t=0,r=e.length;t<r;t++)o+=(o<<5)+e.charCodeAt(t);return o&2147483647}addToHash(e,o){return(e+this.genHash(o))%W}};try{importScripts("/static_files/worker_deps.js")}catch(n){console.error(`Failed to import libs: ${n}`)}var de={};self.addEventListener("message",n=>{let e=n.data;switch(e.eventType){case 0:{let o=He(e.paneId,e.graph,e.showOnNodeItemTypes,e.nodeDataProviderRuns,e.config,e.groupNodeChildrenCountThreshold,e.flattenLayers,e.keepLayersWithASingleChild,e.initialLayout);U(o,e.paneId);let t={eventType:1,modelGraph:o,paneId:e.paneId};postMessage(t);break}case 9:{let o=K(e.modelGraphId,e.paneId),t=JSON.parse(JSON.stringify(o));U(t,e.rendererId);let r={eventType:10,modelGraph:o,paneId:e.paneId,rendererId:e.rendererId,groupNodeId:e.groupNodeId,initialPosition:e.initialPosition};postMessage(r);break}case 2:{let o=K(e.modelGraphId,e.rendererId),t=[];e.expand?t=Ye(o,e.groupNodeId,e.showOnNodeItemTypes,e.nodeDataProviderRuns,e.all===!0):t=$e(o,e.groupNodeId,e.showOnNodeItemTypes,e.nodeDataProviderRuns,e.all===!0),U(o,e.rendererId);let r={eventType:3,modelGraph:o,expanded:e.expand,groupNodeId:e.groupNodeId,rendererId:e.rendererId,deepestExpandedGroupNodeIds:t};postMessage(r);break}case 4:{let o=K(e.modelGraphId,e.rendererId);Fe(o,e.showOnNodeItemTypes,e.nodeDataProviderRuns,e.targetDeepestGroupNodeIdsToExpand,e.clearAllExpandStates),U(o,e.rendererId);let t={eventType:5,modelGraph:o,selectedNodeId:e.selectedNodeId,rendererId:e.rendererId,forRestoringUiState:e.forRestoringUiState,rectToZoomFit:e.rectToZoomFit,forRestoringSnapshotAfterTogglingFlattenLayers:e.forRestoringSnapshotAfterTogglingFlattenLayers,targetDeepestGroupNodeIdsToExpand:e.targetDeepestGroupNodeIdsToExpand};postMessage(t);break}case 6:{let o=K(e.modelGraphId,e.rendererId),t=We(o,e.showOnNodeItemTypes,e.nodeDataProviderRuns,e.nodeId);U(o,e.rendererId);let r={eventType:7,modelGraph:o,nodeId:e.nodeId,rendererId:e.rendererId,deepestExpandedGroupNodeIds:t,noNodeShake:e.noNodeShake,select:e.select};postMessage(r);break}case 11:{de={};break}default:break}});function He(n,e,o,t,r,s,d,a,l){let i,g=new F(n,e,r,o,{},s,!1,d,a).process();if(g.nodesById[""]!=null&&(i="Some nodes have empty strings as ids which will cause layout failures. See console for details.",console.warn("Nodes with empty ids",g.nodesById[""])),!i&&l){let h=new T(g,dagre,o,t);try{h.layout()}catch(m){i=`Failed to layout graph: ${m}`}}return x(n,"Laying out root layer",i),new X(g).markIdenticalGroups(),x(n,"Finding identical layers"),g}function Ye(n,e,o,t,r){let s=new L(n,dagre,o,t);if(e!=null){let d,a=n.nodesById[e];if(a&&N(a)){a.expanded=!0;let i=a;for(;;){let g=i.nsChildrenIds||[];if(g.length===1){let p=n.nodesById[g[0]];if(p&&N(p))p.expanded=!0,i=p;else break}else break}let c=[];A(i,n,c),d=c.length===0?[i.id]:c;for(let g of i.descendantsNodeIds||[]){let p=n.nodesById[g];p.width=void 0,p.height=void 0}}if(r){for(let i of a.descendantsNodeIds||[]){let c=n.nodesById[i];N(c)&&(c.expanded=!0)}d=void 0}s.reLayoutGraph(d);let l=[];return A(void 0,n,l),l}else return s.expandAllGroups()}function $e(n,e,o,t,r){let s=new L(n,dagre,o,t);if(e!=null){if(r){let d=n.nodesById[e];for(let a of d.descendantsNodeIds||[]){let l=n.nodesById[a];N(l)&&(l.expanded=!1,l.width=void 0,l.height=void 0,delete n.edgesByGroupNodeIds[l.id])}}return s.collapseGroupNode(e)}else return s.collapseAllGroup()}function Fe(n,e,o,t,r){new L(n,dagre,e,o).reLayoutGraph(t,r)}function We(n,e,o,t){return new L(n,dagre,e,o).expandToRevealNode(t)}function U(n,e){de[Pe(n.id,e)]=n}function K(n,e){let o=de[Pe(n,e)];if(o==null)throw new Error(`ModelGraph with id "${n}" not found for rendererId "${e}"`);return o}function Pe(n,e){return`${n}___${e}`}
