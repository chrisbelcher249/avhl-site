import {redirect} from "next/navigation";
export const metadata={title:"Relegation Odds"};
export default function SeasonMarketRedirect(){redirect("/odds/season?market=relegation");}
