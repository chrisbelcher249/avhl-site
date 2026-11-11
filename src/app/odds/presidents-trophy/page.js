import {redirect} from "next/navigation";
export const metadata={title:"Presidents' Trophy"};
export default function LegacyFuturesRedirect(){redirect("/odds/season?market=presidents");}
