export type TeamTheme={primary:string;hover:string;pressed:string;foreground:string;soft:string;border:string;focus:string};

const FALLBACK="#16734b";

function hexToRgb(value:string){
  const clean=value.trim().replace(/^#/,"");
  const expanded=clean.length===3?clean.split("").map(part=>part+part).join(""):clean;
  if(!/^[0-9a-f]{6}$/i.test(expanded))return null;
  return {r:Number.parseInt(expanded.slice(0,2),16),g:Number.parseInt(expanded.slice(2,4),16),b:Number.parseInt(expanded.slice(4,6),16)};
}

function rgbToHex({r,g,b}:{r:number;g:number;b:number}){
  return `#${[r,g,b].map(value=>Math.round(Math.max(0,Math.min(255,value))).toString(16).padStart(2,"0")).join("")}`;
}

function mix(from:{r:number;g:number;b:number},to:{r:number;g:number;b:number},amount:number){
  return {r:from.r+(to.r-from.r)*amount,g:from.g+(to.g-from.g)*amount,b:from.b+(to.b-from.b)*amount};
}

function channel(value:number){const c=value/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}
function luminance(rgb:{r:number;g:number;b:number}){return .2126*channel(rgb.r)+.7152*channel(rgb.g)+.0722*channel(rgb.b)}
function contrast(a:number,b:number){return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}

export function createTeamTheme(value:string|null|undefined):TeamTheme{
  const rgb=hexToRgb(value??"")??hexToRgb(FALLBACK)!;
  const primary=rgbToHex(rgb);
  const lum=luminance(rgb);
  const whiteContrast=contrast(lum,1),darkContrast=contrast(lum,luminance({r:17,g:33,b:26}));
  const foreground=whiteContrast>=darkContrast?"#ffffff":"#11211a";
  const shadeTarget=lum>.45?{r:0,g:0,b:0}:{r:255,g:255,b:255};
  return {
    primary,
    hover:rgbToHex(mix(rgb,shadeTarget,lum>.45?.16:.12)),
    pressed:rgbToHex(mix(rgb,shadeTarget,lum>.45?.26:.2)),
    foreground,
    soft:rgbToHex(mix(rgb,{r:255,g:255,b:255},.88)),
    border:rgbToHex(mix(rgb,{r:255,g:255,b:255},.58)),
    focus:rgbToHex(mix(rgb,{r:255,g:255,b:255},.28)),
  };
}
