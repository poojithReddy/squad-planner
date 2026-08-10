import{requirePermission}from"@/lib/permissions/server";
export default async function Layout({children}:{children:React.ReactNode}){await requirePermission({module:"tournaments",action:"view",scopeType:"platform",scopeId:null});return children}
