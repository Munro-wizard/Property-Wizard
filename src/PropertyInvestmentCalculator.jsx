import React, { useMemo, useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import "./index.css";

export default function PropertyInvestmentCalculator() {
  const [theme, setTheme] = useState("light");
  const isDark = theme === "dark";
  const calcRef = useRef(null);

  const [purchasePrice, setPurchasePrice] = useState(0);
  const [marketValue, setMarketValue] = useState(0);
  const [depositPercent, setDepositPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(7);
  const [rent, setRent] = useState(0);
  const [rentPeriod, setRentPeriod] = useState("weekly");
  const [vacancyWeeks, setVacancyWeeks] = useState(2);
  const [rates, setRates] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [maintenance, setMaintenance] = useState(0);
  const [bodyCorp, setBodyCorp] = useState(0);
  const [propertyMgmtPercent, setPropertyMgmtPercent] = useState(8);

  const fmtNZD = (n) => isFinite(n) ? new Intl.NumberFormat("en-NZ",{ style:"currency", currency:"NZD", maximumFractionDigits:0 }).format(n) : "—";
  const fmtPct2 = (n) => (isFinite(n) ? `${n.toFixed(2)}%` : "—");
  const clamp = (v, min, max) => Math.min(Math.max(v ?? 0, min), max);

  const loanAmount = useMemo(() => {
    const d = clamp(depositPercent,0,100)/100;
    return Math.max(0, (purchasePrice||0) * (1-d));
  }, [purchasePrice, depositPercent]);

  const annualRent = useMemo(() => {
    const f = rentPeriod === "weekly" ? 52 : rentPeriod === "fortnightly" ? 26 : rentPeriod === "monthly" ? 12 : 1;
    const gross = (rent||0) * f;
    const vf = clamp(52 - (vacancyWeeks||0), 0, 52) / 52;
    return gross * vf;
  }, [rent, rentPeriod, vacancyWeeks]);

  const propertyMgmtCost = (annualRent * propertyMgmtPercent)/100;
  const annualExpenses = useMemo(() => rates+insurance+maintenance+bodyCorp+propertyMgmtCost, [rates,insurance,maintenance,bodyCorp,propertyMgmtCost]);

  const annualDebtService = useMemo(() => {
    const r = (interestRate||0)/100;
    if (loanAmount <= 0 || r < 0) return 0;
    return loanAmount * r;
  }, [loanAmount, interestRate]);

  const equityAtPurchase = Math.max(0, (marketValue||0) - loanAmount);
  const grossYield = purchasePrice>0 ? (annualRent/purchasePrice)*100 : NaN;
  const netYield   = purchasePrice>0 ? ((annualRent-annualExpenses)/purchasePrice)*100 : NaN;
  const cashFlow = annualRent - annualExpenses - annualDebtService;
  const weeklyCashFlow = cashFlow / 52;
  const belowMarketPercent = marketValue>0 ? ((marketValue-purchasePrice)/marketValue)*100 : NaN;

  const shell = isDark ? "flex justify-center items-start min-h-screen bg-neutral-900 p-10 text-[#33ff99]" : "flex justify-center items-start min-h-screen bg-gray-100 p-10 text-gray-900";
  const calcBox = isDark ? "p-6 border border-green-700 bg-black rounded-lg max-w-5xl w-full" : "p-6 border border-gray-300 bg-white rounded-lg max-w-5xl w-full shadow-sm";
  const panel = isDark ? "grid grid-cols-2 border border-green-700" : "grid grid-cols-2 border border-gray-300";
  const cell = isDark ? "border border-green-700 p-3 text-left font-mono text-sm bg-black even:bg-neutral-950/80" : "border border-gray-300 p-3 text-left font-mono text-sm bg-white even:bg-gray-50";
  const headerCell = isDark ? "border border-yellow-400 p-3 font-bold text-yellow-300 bg-black text-center tracking-widest text-base uppercase" : "border border-gray-500 p-3 font-bold text-gray-800 bg-gray-100 text-center tracking-widest text-base uppercase";
  const inputClass = isDark ? "float-right w-28 text-right border border-gray-600 bg-black text-[#33ff99] font-mono px-1 py-0.5 focus:outline-none focus:ring focus:ring-green-500 appearance-none" : "float-right w-28 text-right border border-gray-300 bg-white text-gray-900 font-mono px-1 py-0.5 focus:outline-none focus:ring focus:ring-gray-500 appearance-none";
  const selectCls = inputClass + " pr-6";
  const pill = (ok) => isDark ? `px-2 py-0.5 rounded ${ok ? "bg-green-900/40" : "bg-red-900/40"} font-semibold` : `px-2 py-0.5 rounded ${ok ? "bg-green-200/70" : "bg-red-200/70"} font-semibold`;

  const handleDownload = async () => {
    if (!calcRef.current) return;
    const backgroundColor = isDark ? "#000000" : "#ffffff";
    const dataUrl = await toJpeg(calcRef.current, { quality: 0.95, backgroundColor });
    const link = document.createElement("a");
    link.download = "property-wizard.jpg";
    link.href = dataUrl;
    link.click();
  };

  return (
    <div ref={calcRef} className={shell}>
      <div className={calcBox}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold font-mono tracking-widest">PROPERTY WIZARD 🧙‍♂️</h1>
          <div className="flex gap-2">
            <button onClick={handleDownload} className={isDark ? "px-3 py-1 border border-yellow-400 text-yellow-300 font-mono hover:bg-yellow-400 hover:text-black transition-colors" : "px-3 py-1 border border-gray-600 text-gray-700 font-mono hover:bg-gray-800 hover:text-white transition-colors"}>Download JPG</button>
            <button onClick={() => setTheme(isDark ? "light" : "dark")} className={isDark ? "px-3 py-1 border border-green-700 text-green-400 font-mono hover:bg-green-400 hover:text-black" : "px-3 py-1 border border-gray-600 text-gray-700 font-mono hover:bg-gray-800 hover:text-white"}>{isDark ? "Light Mode" : "Dark Mode"}</button>
          </div>
        </div>

        <div className={panel}>
          <div className={headerCell}>Annual Expenses</div>
          <div className={headerCell}>Purchase & Finance</div>

          <div className={cell}>Rates <input type="number" value={rates} onChange={(e)=>setRates(Number(e.target.value))} className={inputClass} /></div>
          <div className={cell}>Purchase Price <input type="number" value={purchasePrice} onChange={(e)=>setPurchasePrice(Number(e.target.value))} className={inputClass} /></div>

          <div className={cell}>Insurance <input type="number" value={insurance} onChange={(e)=>setInsurance(Number(e.target.value))} className={inputClass} /></div>
          <div className={cell}>Market Value <input type="number" value={marketValue} onChange={(e)=>setMarketValue(Number(e.target.value))} className={inputClass} /></div>

          <div className={cell}>Maintenance <input type="number" value={maintenance} onChange={(e)=>setMaintenance(Number(e.target.value))} className={inputClass} /></div>
          <div className={cell}>Deposit % <input type="number" value={depositPercent} onChange={(e)=>setDepositPercent(Number(e.target.value))} className={inputClass} /></div>

          <div className={cell}>Body Corporate <input type="number" value={bodyCorp} onChange={(e)=>setBodyCorp(Number(e.target.value))} className={inputClass} /></div>
          <div className={cell}>Interest Rate % <input type="number" value={interestRate} onChange={(e)=>setInterestRate(Number(e.target.value))} className={inputClass} /></div>

          <div className={cell}>Property Mgmt % <input type="number" value={propertyMgmtPercent} onChange={(e)=>setPropertyMgmtPercent(Number(e.target.value))} className={inputClass} /></div>
          <div className={cell}>Rent <input type="number" value={rent} onChange={(e)=>setRent(Number(e.target.value))} className={inputClass} /></div>

          <div className={cell}>Rent Period <select value={rentPeriod} onChange={(e)=>setRentPeriod(e.target.value)} className={selectCls}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className={cell}>Vacant Weeks (p.a.) <input type="number" value={vacancyWeeks} onChange={(e)=>setVacancyWeeks(Number(e.target.value))} className={inputClass} /></div>

          <div className={headerCell}>Income</div>
          <div className={headerCell}>Performance Summary</div>

          <div className={cell}>Annual Rent <span className={`${isDark ? "text-[#33ff99]" : "text-gray-800"} float-right font-semibold`}>{fmtNZD(annualRent)}</span></div>
          <div className={cell}>Below Market Value <span className={`${isDark ? "text-[#33ff99]" : "text-gray-800"} float-right font-semibold`}>{fmtPct2(belowMarketPercent)}</span></div>

          <div className={cell}>Annual Expenses <span className={`${isDark ? "text-[#33ff99]" : "text-gray-800"} float-right font-semibold`}>{fmtNZD(annualExpenses)}</span></div>
          <div className={cell}>Equity at Purchase <span className={`${isDark ? "text-[#33ff99]" : "text-gray-800"} float-right font-semibold`}>{fmtNZD(equityAtPurchase)}</span></div>

          <div className={cell}>Annual Debt Service <span className={`${isDark ? "text-[#33ff99]" : "text-gray-800"} float-right font-semibold`}>{fmtNZD(annualDebtService)}</span></div>
          <div className={cell}>Gross Yield <span className={`${isDark ? "text-[#33ff99]" : "text-gray-800"} float-right font-semibold`}>{fmtPct2(grossYield)}</span></div>

          <div className={cell}>Weekly Cash Flow <span className={`${pill(weeklyCashFlow>=0)} float-right`}>{fmtNZD(weeklyCashFlow)}</span></div>
          <div className={cell}>Net Yield <span className={`${isDark ? "text-[#33ff99]" : "text-gray-800"} float-right font-semibold`}>{fmtPct2(netYield)}</span></div>

          <div className={cell}>Annual Cash Flow <span className={`${pill(cashFlow>=0)} float-right`}>{fmtNZD(cashFlow)}</span></div>
          <div className={cell}>Loan Amount <span className={`${isDark ? "text-[#33ff99]" : "text-gray-800"} float-right font-semibold`}>{fmtNZD(loanAmount)}</span></div>
        </div>

        <div className={isDark ? "text-left text-xs text-[#33ff99]/70 mt-6 italic tracking-widest" : "text-left text-xs text-gray-600 mt-6 italic tracking-widest"}>
          Property Wizard — Analytical Tools for Investors
        </div>
      </div>
    </div>
  );
}
