import {redirect} from "next/navigation";
export const metadata={title:"Win Totals"};
export default function SeasonMarketRedirect(){redirect("/odds/season?market=wins");}
