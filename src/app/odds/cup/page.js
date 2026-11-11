import {redirect} from "next/navigation";
export const metadata={title:"Cup Odds"};
export default function LegacyFuturesRedirect(){redirect("/odds/season?market=cup");}
