import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
export const alt = "Arieya — Your guide all the way to checkout.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const [regular, italic] = await Promise.all([
    readFile(process.cwd() + "/node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff"),
    readFile(process.cwd() + "/node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff"),
  ]);
  return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",background:"#151914",padding:"65px 75px",color:"#f3efe5"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:37,color:"#d5b782",letterSpacing:3}}>ARIEYA</span><span style={{fontSize:17,color:"#aebba0"}}>Shopping begins with a conversation</span></div><div style={{display:"flex",flexDirection:"column",fontFamily:"Cormorant Garamond",fontSize:84,letterSpacing:-2,lineHeight:1.1}}><span>The right thing</span><span>starts with what <span style={{color:"#d5b782",fontStyle:"italic",marginLeft:16}}>you say.</span></span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:19,borderTop:"1px solid #3c4934",paddingTop:25}}><span>Thoughtful advice. Real products.</span><span style={{color:"#d5b782"}}>Meet Arieya</span></div></div>,{...size, fonts:[{name:"Cormorant Garamond",data:regular,weight:400,style:"normal"},{name:"Cormorant Garamond",data:italic,weight:400,style:"italic"}]});
}
