import React, { useMemo, useRef, useState } from "react";
import { toJpeg } from "html-to-image";

function slugifyFilename(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "property-wizard";
  return (
    trimmed
      .replace(/[^A-Za-z0-9\s-]/g, "") // basic ASCII safe
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "property-wizard"
  );
}

function toNumberOrZero(s) {
  if (s === null || s === undefined) return 0;
  const v = typeof s === "number" ? s : Number(String(s).replace(/,/g, "").trim());
  return Number.isFinite(v) ? v : 0;
}

function fmtCurrency(n) {
  const v = toNumberOrZero(n);
  return "$" + Math.round(v).toLocaleString();
}

function fmtPct(n, decimals = 2) {
  const v = toNumberOrZero(n);
  return v.toFixed(decimals) + "%";
}

function formatNumberInput(value) {
  // Accept digits, optional leading '-', and a single decimal point. Strip commas/spaces.
  const cleaned = String(value ?? "").replace(/,/g, "").replace(/\s+/g, "");
  if (!cleaned) return "";

  // Keep a leading minus if present (even though most fields are positive; harmless).
  const neg = cleaned.startsWith("-") ? "-" : "";
  const body = cleaned.replace(/[^0-9.]/g, "");

  // Only one decimal point.
  const firstDot = body.indexOf(".");
  const hasDot = firstDot !== -1;
  const intPartRaw = hasDot ? body.slice(0, firstDot) : body;
  const fracPartRaw = hasDot ? body.slice(firstDot + 1) : "";

  // Preserve a trailing dot (e.g. "12.") while typing.
  const endsWithDot = hasDot && body.endsWith(".");

  // Insert commas into the integer part without collapsing leading zeros.
  const intPart = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fracPart = fracPartRaw; // don't format fraction

  if (hasDot) {
    return neg + intPart + "." + (endsWithDot ? "" : fracPart);
  }
  return neg + intPart;
}

function setCaretPreservingFormat(e, setter) {
  const el = e.target;
  const caret = el.selectionStart ?? 0;
  const before = el.value.slice(0, caret);
  const nonCommaCount = before.replace(/,/g, "").length;

  const formatted = formatNumberInput(el.value);
  setter(formatted);

  // Restore caret after React applies the controlled value.
  requestAnimationFrame(() => {
    try {
      const v = formatted;
      let count = 0;
      let pos = 0;
      for (; pos < v.length; pos++) {
        if (v[pos] !== ",") count++;
        if (count >= nonCommaCount) {
          pos += 1;
          break;
        }
      }
      el.setSelectionRange(pos, pos);
    } catch {
      // ignore
    }
  });
}

// Defined at module scope so inputs don't remount on every keystroke.
const Row = ({ label, right }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="min-w-0 flex-1 pr-3">{label}</span>
    <div className="shrink-0">{right}</div>
  </div>
);

const NumInput = ({ value, onChange, className }) => (
  <input
    type="text"
    inputMode="decimal"
    pattern="[0-9]*"
    value={value}
    onChange={onChange}
    className={className}
  />
);

export default function PropertyInvestmentCalculator() {
  const calcRef = useRef(null);
  const [theme, setTheme] = useState("light");

  const [propertyName, setPropertyName] = useState("");

  // Editable numeric fields as strings, blank by default.
  const [purchasePrice, setPurchasePrice] = useState("");
  const [marketValue, setMarketValue] = useState("");
  const [depositPercent, setDepositPercent] = useState("");
  const [interestRate, setInterestRate] = useState("");

  const [rent, setRent] = useState("");
  const [rentPeriod, setRentPeriod] = useState("weekly");

  const [vacancyWeeks, setVacancyWeeks] = useState("");
  const [rates, setRates] = useState("");
  const [insurance, setInsurance] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [bodyCorp, setBodyCorp] = useState("");

  // Requested default: 0
  // Keep UI blank, but treat as 0 internally via toNumberOrZero.
  const [propertyMgmtPercent, setPropertyMgmtPercent] = useState("");

  const n = useMemo(
    () => ({
      purchasePrice: toNumberOrZero(purchasePrice),
      marketValue: toNumberOrZero(marketValue),
      depositPercent: toNumberOrZero(depositPercent),
      interestRate: toNumberOrZero(interestRate),
      rent: toNumberOrZero(rent),
      vacancyWeeks: toNumberOrZero(vacancyWeeks),
      rates: toNumberOrZero(rates),
      insurance: toNumberOrZero(insurance),
      maintenance: toNumberOrZero(maintenance),
      bodyCorp: toNumberOrZero(bodyCorp),
      propertyMgmtPercent: toNumberOrZero(propertyMgmtPercent),
    }),
    [
      purchasePrice,
      marketValue,
      depositPercent,
      interestRate,
      rent,
      vacancyWeeks,
      rates,
      insurance,
      maintenance,
      bodyCorp,
      propertyMgmtPercent,
    ]
  );

  const annualRent = useMemo(() => {
    const factor =
      rentPeriod === "weekly"
        ? 52
        : rentPeriod === "fortnightly"
        ? 26
        : rentPeriod === "monthly"
        ? 12
        : 1;
    const vacancyFactor = (52 - n.vacancyWeeks) / 52;
    return n.rent * factor * vacancyFactor;
  }, [rentPeriod, n.rent, n.vacancyWeeks]);

  const loanAmount = useMemo(
    () => n.purchasePrice * (1 - n.depositPercent / 100),
    [n.purchasePrice, n.depositPercent]
  );

  const equityAtPurchase = useMemo(() => n.marketValue - loanAmount, [n.marketValue, loanAmount]);

  const propertyMgmt = useMemo(
    () => (annualRent * n.propertyMgmtPercent) / 100,
    [annualRent, n.propertyMgmtPercent]
  );

  const annualExpenses = useMemo(
    () => n.rates + n.insurance + n.maintenance + n.bodyCorp + propertyMgmt,
    [n.rates, n.insurance, n.maintenance, n.bodyCorp, propertyMgmt]
  );

  const grossYield = useMemo(
    () => (n.purchasePrice > 0 ? (annualRent / n.purchasePrice) * 100 : 0),
    [annualRent, n.purchasePrice]
  );

  const netYield = useMemo(
    () => (n.purchasePrice > 0 ? ((annualRent - annualExpenses) / n.purchasePrice) * 100 : 0),
    [annualRent, annualExpenses, n.purchasePrice]
  );

  const annualDebtService = useMemo(
    () => loanAmount * (n.interestRate / 100),
    [loanAmount, n.interestRate]
  );

  const cashFlow = useMemo(
    () => annualRent - annualExpenses - annualDebtService,
    [annualRent, annualExpenses, annualDebtService]
  );

  const weeklyCashFlow = useMemo(() => cashFlow / 52, [cashFlow]);

  // Below market should be negative when purchasePrice is below marketValue.
  // Example: 9% below market -> -9% (green). 9% above market -> 9% (red).
  const belowMarketPercent = useMemo(
    () => (n.marketValue > 0 ? ((n.purchasePrice - n.marketValue) / n.marketValue) * 100 : 0),
    [n.marketValue, n.purchasePrice]
  );

  const isDark = theme === "dark";

  const shell = isDark
    ? "pw-shell min-h-screen bg-neutral-900/10 px-3 py-3 sm:px-6 sm:py-4 flex justify-center items-start"
    : "pw-shell min-h-screen bg-gray-100 px-3 py-3 sm:px-6 sm:py-4 flex justify-center items-start";

  const calcBox = isDark
    ? "pw-calcbox w-full max-w-5xl border border-yellow-400 bg-black text-[#33ff99] rounded-lg shadow-md px-4 py-3 sm:px-6 sm:py-4"
    : "pw-calcbox w-full max-w-5xl border border-gray-300 bg-white text-gray-900 rounded-lg shadow-md px-4 py-3 sm:px-6 sm:py-4";

  const headerCell = isDark
    ? "pw-header border border-yellow-400 p-3 font-bold text-yellow-300 bg-black text-center tracking-widest text-base uppercase"
    : "pw-header border border-gray-300 p-3 font-bold text-gray-800 bg-gray-100 text-center tracking-widest text-base uppercase";

  const panel = isDark
    ? "pw-panel grid grid-cols-1 md:grid-cols-2 border border-yellow-400"
    : "pw-panel grid grid-cols-1 md:grid-cols-2 border border-gray-300";

  const cell = isDark
    ? "pw-cell border border-yellow-400 px-4 py-3 font-mono text-sm bg-black"
    : "pw-cell border border-gray-300 px-4 py-3 font-mono text-sm bg-white even:bg-gray-50";

  const inputClass = isDark
    ? "pw-input w-28 sm:w-32 text-center border border-yellow-400 bg-black text-[#33ff99] font-mono px-2 py-1 focus:outline-none focus:ring focus:ring-yellow-500 rounded appearance-none"
    : "pw-input w-28 sm:w-32 text-center border border-gray-300 bg-white text-gray-900 font-mono px-2 py-1 focus:outline-none focus:ring focus:ring-gray-400 rounded appearance-none";

  const valueBoxBase = isDark
    ? "pw-value w-28 sm:w-32 text-center border border-yellow-400 bg-black text-[#33ff99] font-mono px-2 py-1 rounded"
    : "pw-input w-28 sm:w-32 text-center border border-gray-300 bg-white text-gray-900 font-mono px-2 py-1 rounded";

  const valueColorClass = (val) => {
    const v = toNumberOrZero(val);
    if (v >= 0) return isDark ? "text-[#33ff99]" : "text-green-700";
    return isDark ? "text-red-400" : "text-red-600";
  };

  const weeklyCashFlowBox = valueBoxBase + " " + valueColorClass(weeklyCashFlow);

  const btn = isDark
    ? "px-3 py-1 border border-yellow-400 text-yellow-300 font-mono hover:bg-yellow-400 hover:text-black transition-colors rounded"
    : "px-3 py-1 border border-gray-300 text-gray-800 font-mono hover:bg-gray-800 hover:text-white transition-colors rounded";

  const handleDownload = async () => {
    if (!calcRef.current) return;
    const backgroundColor = isDark ? "#000000" : "#ffffff";
    const dataUrl = await toJpeg(calcRef.current, { quality: 0.95, backgroundColor });

    const safeName = slugifyFilename(propertyName);
    const link = document.createElement("a");
    link.download = `${safeName}.jpg`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className={shell}>
      <div className={calcBox} ref={calcRef}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-widest">
            PROPERTY WIZARD 🧙‍♂️
          </h1>
          <div className="flex gap-2">
            <button onClick={handleDownload} className={btn}>
              Download JPG
            </button>
            <button onClick={() => setTheme(isDark ? "light" : "dark")} className={btn}>
              {isDark ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </div>

        <div className="mb-3">
          <input
            type="text"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
            placeholder="Property Name"
            className={
              isDark
                ? "w-full border border-yellow-400 bg-black text-yellow-300 font-mono px-3 py-2 rounded focus:outline-none focus:ring focus:ring-yellow-500"
                : "w-full border border-gray-300 bg-white text-gray-800 font-mono px-3 py-2 rounded focus:outline-none focus:ring focus:ring-gray-400"
            }
          />
        </div>

        <div className={panel}>
          <div className={headerCell}>Annual Expenses</div>
          <div className={headerCell}>Purchase Details</div>

          <div className={cell}>
            <Row
              label="Rates"
              right={
                <NumInput
                  value={rates}
                  onChange={(e) => setCaretPreservingFormat(e, setRates)}
                  className={inputClass}
                />
              }
            />
          </div>
          <div className={cell}>
            <Row
              label="Purchase Price"
              right={
                <NumInput
                  value={purchasePrice}
                  onChange={(e) => setCaretPreservingFormat(e, setPurchasePrice)}
                  className={inputClass}
                />
              }
            />
          </div>

          <div className={cell}>
            <Row
              label="Insurance"
              right={
                <NumInput
                  value={insurance}
                  onChange={(e) => setCaretPreservingFormat(e, setInsurance)}
                  className={inputClass}
                />
              }
            />
          </div>
          <div className={cell}>
            <Row
              label="Market Value"
              right={
                <NumInput
                  value={marketValue}
                  onChange={(e) => setCaretPreservingFormat(e, setMarketValue)}
                  className={inputClass}
                />
              }
            />
          </div>

          <div className={cell}>
            <Row
              label="Maintenance"
              right={
                <NumInput
                  value={maintenance}
                  onChange={(e) => setCaretPreservingFormat(e, setMaintenance)}
                  className={inputClass}
                />
              }
            />
          </div>
          <div className={cell}>
            <Row
              label="Deposit %"
              right={
                <NumInput
                  value={depositPercent}
                  onChange={(e) => setCaretPreservingFormat(e, setDepositPercent)}
                  className={inputClass}
                />
              }
            />
          </div>

          <div className={cell}>
            <Row
              label="Body Corporate"
              right={
                <NumInput
                  value={bodyCorp}
                  onChange={(e) => setCaretPreservingFormat(e, setBodyCorp)}
                  className={inputClass}
                />
              }
            />
          </div>
          <div className={cell}>
            <Row
              label="Interest Rate %"
              right={
                <NumInput
                  value={interestRate}
                  onChange={(e) => setCaretPreservingFormat(e, setInterestRate)}
                  className={inputClass}
                />
              }
            />
          </div>

          <div className={cell}>
            <Row
              label="Property Mgmt %"
              right={
                <NumInput
                  value={propertyMgmtPercent}
                  onChange={(e) => setCaretPreservingFormat(e, setPropertyMgmtPercent)}
                  className={inputClass}
                />
              }
            />
          </div>
          <div className={cell}>
            <Row
              label="Rent"
              right={
                <NumInput
                  value={rent}
                  onChange={(e) => setCaretPreservingFormat(e, setRent)}
                  className={inputClass}
                />
              }
            />
          </div>

          <div className={cell}>
            <Row
              label="Vacancy (weeks)"
              right={
                <NumInput
                  value={vacancyWeeks}
                  onChange={(e) => setCaretPreservingFormat(e, setVacancyWeeks)}
                  className={inputClass}
                />
              }
            />
          </div>
          <div className={cell}>
            <Row
              label="Rent Period"
              right={
                <select
                  value={rentPeriod}
                  onChange={(e) => setRentPeriod(e.target.value)}
                  className={inputClass}
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              }
            />
          </div>

          {/* On mobile the grid is 1 column, so show a single Results header.
              On desktop (md+), show two column headings. */}
          <div className={`${headerCell} md:hidden`}>Results</div>
          <div className={`${headerCell} hidden md:block`}>Balance Sheet</div>
          <div className={`${headerCell} hidden md:block`}>Returns</div>

          {/* Row 1 */}
          <div className={cell}>
            <Row
              label="Equity at Purchase"
              right={
                <div className={`${valueBoxBase} ${valueColorClass(equityAtPurchase)}`}>
                  {fmtCurrency(equityAtPurchase)}
                </div>
              }
            />
          </div>
          <div className={cell}>
            <Row label="Gross Yield" right={<div className={valueBoxBase}>{fmtPct(grossYield)}</div>} />
          </div>

          {/* Row 2 */}
          <div className={cell}>
            <Row
              label="Below Market"
              right={
                <div className={`${valueBoxBase} ${valueColorClass(belowMarketPercent)}`}>
                  {fmtPct(belowMarketPercent)}
                </div>
              }
            />
          </div>
          <div className={cell}>
            <Row label="Net Yield" right={<div className={valueBoxBase}>{fmtPct(netYield)}</div>} />
          </div>

          {/* Row 3 */}
          <div className={cell}>
            <Row
              label="Annual Expenses"
              right={<div className={valueBoxBase}>{fmtCurrency(annualExpenses)}</div>}
            />
          </div>
          <div className={cell}>
            <Row label="Annual Rent" right={<div className={valueBoxBase}>{fmtCurrency(annualRent)}</div>} />
          </div>

          {/* Row 4 */}
          <div className={cell}>
            <Row label="Loan Amount" right={<div className={valueBoxBase}>{fmtCurrency(loanAmount)}</div>} />
          </div>
          <div className={cell}>
            <Row
              label="Annual Cash Flow"
              right={
                <div className={`${valueBoxBase} ${valueColorClass(cashFlow)}`}>
                  {fmtCurrency(cashFlow)}
                </div>
              }
            />
          </div>

          {/* Row 5 */}
          <div className={cell}>
            <Row
              label="Annual Debt Service"
              right={<div className={valueBoxBase}>{fmtCurrency(annualDebtService)}</div>}
            />
          </div>
          <div className={cell}>
            <Row
              label="Weekly Cash Flow"
              right={<div className={weeklyCashFlowBox}>{fmtCurrency(weeklyCashFlow)}</div>}
            />
          </div>
        </div>

        <div
          className={
            isDark
              ? "mt-3 text-xs text-[#33ff99]/70 italic tracking-widest"
              : "mt-3 text-xs text-gray-600 italic tracking-widest"
          }
        >
          Property Wizard — Analytical Tools for Investors
        </div>
      </div>
    </div>
  );
}
