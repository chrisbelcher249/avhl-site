import {redirect} from "next/navigation";
export const metadata={title:"Playoff Odds"};
export default function SeasonMarketRedirect(){redirect("/odds/season?market=playoffs");}
