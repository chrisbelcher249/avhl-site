import {redirect} from "next/navigation";
export const metadata={title:"Division Futures"};
export default function LegacyFuturesRedirect(){redirect("/odds/season?market=division");}
