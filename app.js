
// === Print Sales Tracker (full) ===
// Uses React 18 UMD + Babel (JSX) + Recharts UMD
const { useState, useMemo, useEffect, useRef } = React;
const {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LabelList, Cell,
  PieChart, Pie, ResponsiveContainer, LineChart, Line, Brush
} = Recharts;

// ---------- Utils ----------
const fmtMoney = (currency, n) => `${currency}${(Number(n) || 0).toFixed(2)}`;
const todayISO = () => new Date().toISOString().split("T")[0];

const escapeCSV = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const toCSV = (rows, cols) => {
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => escapeCSV(r[c])).join(",")).join("\n");
  return header + "\n" + body;
};
const downloadCSV = (filename, csv) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-3 border">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function CashComparison({ currency, salesOnly }) {
  const { all, exclCash } = salesOnly;
  const data = [
    { name: "Revenue", All: all.revenue, NoCash: exclCash.revenue },
    { name: "COGS", All: all.cogs, NoCash: exclCash.cogs },
    { name: "Gross Profit", All: all.revenue - all.cogs, NoCash: exclCash.revenue - exclCash.cogs },
    { name: "Net (after tax)", All: all.revenue - all.cogs - all.tax, NoCash: exclCash.revenue - exclCash.cogs - exclCash.tax },
  ];
  return (
    <div className="w-full h-80 mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(val) => fmtMoney(currency, val)} />
          <Legend />
          <Bar dataKey="All" fill="#2563eb">
            <LabelList dataKey="All" position="top" formatter={(v) => fmtMoney(currency, v)} />
          </Bar>
          <Bar dataKey="NoCash" fill="#ef4444">
            <LabelList dataKey="NoCash" position="top" formatter={(v) => fmtMoney(currency, v)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function App() {
  // ---------- State ----------
  const [tab, setTab] = useState("sales");

  const [sales, setSales] = useState([
    { date: "2025-08-01", item: "T-Rex Skull Replica", channel: "Website", filamentCost: 8.5, powerCost: 1.2, otherCosts: 0.5, deliveryCost: 5, totalCost: 15.2, price: 50, taxAmount: 10, profit: 24.8, printingTime: 10, taxRate: "20" },
    { date: "2025-08-02", item: "Velociraptor Claw Model", channel: "Cash", filamentCost: 3.2, powerCost: 0.75, otherCosts: 0.4, deliveryCost: 0, totalCost: 4.35, price: 18, taxAmount: 3.6, profit: 10.05, printingTime: 4, taxRate: "20" },
    { date: "2025-08-03", item: "Triceratops Horn Replica", channel: "Ebay", filamentCost: 6, powerCost: 1.0, otherCosts: 0.6, deliveryCost: 4, totalCost: 11.6, price: 40, taxAmount: 8, profit: 20.4, printingTime: 8, taxRate: "20" },
  ]);

  const [items, setItems] = useState([
    { id: 1, name: "T-Rex Skull Replica", filamentCost: 8.5, powerCost: 1.2, otherCosts: 0.5, printingTime: 10, removed: false },
    { id: 2, name: "Velociraptor Claw Model", filamentCost: 3.2, powerCost: 0.75, otherCosts: 0.4, printingTime: 4, removed: false },
    { id: 3, name: "Triceratops Horn Replica", filamentCost: 6, powerCost: 1.0, otherCosts: 0.6, printingTime: 8, removed: false },
  ]);

  const [channels, setChannels] = useState(["Website", "Ebay", "Cash"]);

  const [expenses, setExpenses] = useState([
    { category: "Filament Purchase", name: "Bulk PLA Filament", cost: 30, date: "2025-07-28", auto: false },
    { category: "Machine Repairs", name: "Extruder Replacement", cost: 15, date: "2025-07-29", auto: false },
    { category: "Waste Filament", name: "Failed Prints", cost: 5, date: "2025-07-30", auto: false },
    { category: "COGS – Filament", name: "T-Rex Skull Replica (filament)", cost: 8.5, date: "2025-08-01", auto: true },
    { category: "COGS – Power", name: "T-Rex Skull Replica (power)", cost: 1.2, date: "2025-08-01", auto: true },
    { category: "COGS – Other", name: "T-Rex Skull Replica (other)", cost: 0.5, date: "2025-08-01", auto: true },
    { category: "COGS – Delivery", name: "T-Rex Skull Replica (delivery)", cost: 5, date: "2025-08-01", auto: true },
  ]);

  const [showCOGS, setShowCOGS] = useState(true);
  const [showCash, setShowCash] = useState(true);
  const [rangeStart, setRangeStart] = useState(() => sales[0]?.date ?? todayISO());
  const [rangeEnd, setRangeEnd] = useState(() => sales[sales.length - 1]?.date ?? todayISO());

  const [currency, setCurrency] = useState(() => localStorage.getItem("currency") || "£");
  useEffect(() => { localStorage.setItem("currency", currency); }, [currency]);

  const [saleForm, setSaleForm] = useState({ item: "T-Rex Skull Replica", price: "", channel: "Website", taxRate: "20", date: todayISO() });
  const [newItem, setNewItem] = useState({ name: "", filamentCost: "", powerCost: "", otherCosts: "", printingTime: "" });
  const [newChannel, setNewChannel] = useState("");
  const [newExpense, setNewExpense] = useState({ category: "Machine Repairs", name: "", cost: "", date: todayISO() });

  // Stable IDs
  const idCounter = useRef(1000);
  const genId = () => idCounter.current++;

  // ---------- Actions ----------
  const addItem = () => {
    if (!newItem.name.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: genId(),
        name: newItem.name.trim(),
        filamentCost: parseFloat(newItem.filamentCost) || 0,
        powerCost: parseFloat(newItem.powerCost) || 0,
        otherCosts: parseFloat(newItem.otherCosts) || 0,
        printingTime: parseFloat(newItem.printingTime) || 0,
        removed: false,
      },
    ]);
    setNewItem({ name: "", filamentCost: "", powerCost: "", otherCosts: "", printingTime: "" });
  };

  const editItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index][field] = field === "name" ? value : parseFloat(value) || 0;
      return updated;
    });
  };

  const toggleItemStatus = (index) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index].removed = !updated[index].removed;
      return updated;
    });
  };

  const addChannel = () => {
    if (!newChannel.trim()) return;
    setChannels((prev) => Array.from(new Set([...prev, newChannel.trim()])));
    setNewChannel("");
  };

  const addSale = () => {
    const selectedItem = items.find((i) => i.name === saleForm.item);
    if (!selectedItem || !saleForm.price) return;

    let deliveryCost = 0;
    if (saleForm.channel !== "Cash") {
      const input = window.prompt("Enter delivery cost:", "0");
      deliveryCost = parseFloat(input || "0") || 0;
    }

    const totalCost = (selectedItem.filamentCost || 0) + (selectedItem.powerCost || 0) + (selectedItem.otherCosts || 0) + deliveryCost;
    const price = parseFloat(saleForm.price);
    theTax = parseFloat(saleForm.taxRate) || 0;
    const taxAmount = (price * theTax) / 100;
    const profit = price - totalCost - taxAmount;

    const saleEntry = {
      ...saleForm,
      filamentCost: selectedItem.filamentCost,
      powerCost: selectedItem.powerCost,
      otherCosts: selectedItem.otherCosts,
      printingTime: selectedItem.printingTime,
      deliveryCost,
      totalCost,
      price,
      taxAmount,
      profit,
    };

    setSales((prev) => [...prev, saleEntry]);
    setSaleForm((prev) => ({ ...prev, price: "", date: todayISO() }));

    const cogsEntries = [
      { category: "COGS – Filament", name: `${saleEntry.item} (filament)`, cost: selectedItem.filamentCost },
      { category: "COGS – Power", name: `${saleEntry.item} (power)`, cost: selectedItem.powerCost },
      { category: "COGS – Other", name: `${saleEntry.item} (other)`, cost: selectedItem.otherCosts },
      { category: "COGS – Delivery", name: `${saleEntry.item} (delivery)`, cost: deliveryCost },
    ].map((e) => ({ ...e, date: saleEntry.date, auto: true }));

    setExpenses((prev) => [...prev, ...cogsEntries]);
  };

  const deleteSale = (index) => {
    setSales((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const addExpense = () => {
    if (!newExpense.name.trim() || !newExpense.cost) return;
    setExpenses((prev) => [
      ...prev,
      { ...newExpense, name: newExpense.name.trim(), cost: parseFloat(newExpense.cost), auto: false },
    ]);
    setNewExpense({ category: "Machine Repairs", name: "", cost: "", date: todayISO() });
  };

  const deleteExpense = (index) => {
    setExpenses((prev) => {
      if (prev[index]?.auto) return prev;
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  // ---------- Derived ----------
  const filteredExpenses = useMemo(
    () => (showCOGS ? expenses : expenses.filter((e) => !e.category.startsWith("COGS –"))),
    [expenses, showCOGS]
  );

  const totalFilamentPurchase = useMemo(
    () => expenses.filter((e) => e.category === "Filament Purchase").reduce((a, e) => a + (e.cost || 0), 0),
    [expenses]
  );
  const totalFilamentUsed = useMemo(
    () => expenses.filter((e) => e.category === "COGS – Filament").reduce((a, e) => a + (e.cost || 0), 0),
    [expenses]
  );
  const netFilamentCost = Math.max(0, totalFilamentPurchase - totalFilamentUsed);

  const totals = useMemo(() => {
    const revenue = sales.reduce((a, s) => a + (s.price || 0), 0);
    const cogsNonFilament = expenses
      .filter((e) => e.category.startsWith("COGS –") && e.category !== "COGS – Filament")
      .reduce((a, e) => a + (e.cost || 0), 0);
    const cogs = cogsNonFilament + netFilamentCost;
    const other = expenses
      .filter((e) => !e.category.startsWith("COGS –") && e.category !== "Filament Purchase")
      .reduce((a, e) => a + (e.cost || 0), 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - other;
    return { revenue, cogs, other, grossProfit, netProfit };
  }, [sales, expenses, netFilamentCost]);

  const salesOnly = useMemo(() => {
    const compute = (arr) =>
      arr.reduce(
        (acc, s) => {
          const item = items.find((i) => i.name === s.item);
          const filament = item?.filamentCost ?? 0;
          const power = item?.powerCost ?? 0;
          const other = item?.otherCosts ?? 0;
          const delivery = s.deliveryCost || 0;
          const price = s.price || 0;
          const taxRate = parseFloat(s.taxRate) || 0;
          const taxAmount = (price * taxRate) / 100;
          const cogs = filament + power + other + delivery;
          acc.revenue += price;
          acc.cogs += cogs;
          acc.tax += taxAmount;
          return acc;
        },
        { revenue: 0, cogs: 0, tax: 0 }
      );

    const byRange = (arr) => arr.filter((s) => s.date >= rangeStart && s.date <= rangeEnd);
    const all = compute(byRange(sales));
    const exclCash = compute(byRange(sales.filter((s) => s.channel !== "Cash")));
    const active = showCash ? all : exclCash;
    return { all, exclCash, active };
  }, [sales, items, showCash, rangeStart, rangeEnd]);

  const timeData = useMemo(() => {
    const acc = sales.reduce((acc, s) => {
      if (!acc[s.item]) acc[s.item] = { item: s.item, hours: 0, profit: 0, count: 0 };
      acc[s.item].hours += s.printingTime || 0;
      const item = items.find((i) => i.name === s.item);
      if (!item) return acc;
      const deliveryCost = s.deliveryCost || 0;
      const taxRate = parseFloat(s.taxRate) || 0;
      const taxAmount = ((s.price || 0) * taxRate) / 100;
      const totalCost = (item.filamentCost || 0) + (item.powerCost || 0) + (item.otherCosts || 0) + deliveryCost;
      const profit = (s.price || 0) - totalCost - taxAmount;
      acc[s.item].profit += profit; acc[s.item].count += 1; return acc;
    }, {});
    return Object.values(acc)
      .map((e) => ({ ...e, profitPerHour: e.hours > 0 ? e.profit / e.hours : 0 }))
      .sort((a, b) => b.profitPerHour - a.profitPerHour);
  }, [sales, items]);

  const highest = timeData.length ? timeData[0].profitPerHour : 0;
  const lowest = timeData.length ? timeData[timeData.length - 1].profitPerHour : 0;

  const lineData = useMemo(() => {
    const map = new Map();
    const inRange = sales.filter((s) => s.date >= rangeStart && s.date <= rangeEnd && (showCash || s.channel !== "Cash"));
    inRange.forEach((s) => {
      const item = items.find((i) => i.name === s.item);
      const filament = item?.filamentCost ?? 0;
      const power = item?.powerCost ?? 0;
      const other = item?.otherCosts ?? 0;
      const delivery = s.deliveryCost || 0;
      const price = s.price || 0;
      const taxRate = parseFloat(s.taxRate) || 0;
      const taxAmount = (price * taxRate) / 100;
      const cogs = filament + power + other + delivery;
      const gross = price - cogs;
      const net = gross - taxAmount;
      if (!map.has(s.date)) map.set(s.date, { date: s.date, revenue: 0, cogs: 0, gross: 0, net: 0 });
      const row = map.get(s.date);
      row.revenue += price; row.cogs += cogs; row.gross += gross; row.net += net;
    });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [sales, items, rangeStart, rangeEnd, showCash]);

  // ---------- Small UI helpers ----------
  const TabButton = ({ id, children }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-2xl text-sm font-medium transition shadow-sm border ${tab === id ? "bg-black text-white" : "bg-white hover:bg-gray-50 text-gray-800"}`}
    >
      {children}
    </button>
  );
  const Panel = ({ show, children }) => (show ? <div className="mt-4">{children}</div> : null);

  // CSV exports
  const exportSalesCSV = () => {
    const cols = ["date","item","channel","price","taxRate","taxAmount","deliveryCost","totalCost","profit","printingTime"]; 
    downloadCSV("sales.csv", toCSV(sales, cols));
  };
  const exportItemsCSV = () => {
    const cols = ["id","name","filamentCost","powerCost","otherCosts","printingTime","removed"]; 
    downloadCSV("items.csv", toCSV(items, cols));
  };
  const exportExpensesCSV = () => {
    const cols = ["date","category","name","cost","auto"]; 
    downloadCSV("expenses.csv", toCSV(filteredExpenses, cols));
  };
  const exportAnalyticsCSV = () => {
    const cols = ["date","revenue","cogs","gross","net"]; 
    downloadCSV("analytics_timeseries.csv", toCSV(lineData, cols));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold">Print Sales Tracker</h1>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-2">
              {([["sales","Sales"],["items","Items"],["expenses","Expenses"],["analytics","Analytics"],["time","Time"]]).map(([id,label]) => (
                <TabButton key={id} id={id}>{label}</TabButton>
              ))}
            </div>
            <select className="ml-2 px-3 py-2 rounded-xl bg-white border" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="£">£ GBP</option>
              <option value="$">$ USD</option>
              <option value="€">€ EUR</option>
              <option value="¥">¥ JPY</option>
            </select>
          </div>
        </header>

        {/* QUICK EXPORTS */}
        <div className="max-w-6xl mx-auto mb-4 flex flex-wrap gap-2">
          <button onClick={exportSalesCSV} className="px-3 py-2 rounded-xl border bg-white">Export Sales CSV</button>
          <button onClick={exportItemsCSV} className="px-3 py-2 rounded-xl border bg-white">Export Items CSV</button>
          <button onClick={exportExpensesCSV} className="px-3 py-2 rounded-xl border bg-white">Export Expenses CSV</button>
          <button onClick={exportAnalyticsCSV} className="px-3 py-2 rounded-xl border bg-white">Export Analytics CSV</button>
        </div>

        {/* SALES TAB */}
        <Panel show={tab === "sales"}>
          <div className="bg-white rounded-2xl p-4 shadow">
            <div className="flex flex-wrap items-end gap-2 mb-4">
              <label className="flex flex-col text-sm">
                <span className="text-gray-600">Item</span>
                <select className="px-3 py-2 rounded-xl border" value={saleForm.item} onChange={e => setSaleForm({ ...saleForm, item: e.target.value })}>
                  {items.filter((i) => !i.removed).map((i) => (<option key={i.id}>{i.name}</option>))}
                </select>
              </label>
              <label className="flex flex-col text-sm">
                <span className="text-gray-600">Price</span>
                <input className="px-3 py-2 rounded-xl border" type="number" placeholder="0.00" value={saleForm.price} onChange={e => setSaleForm({ ...saleForm, price: e.target.value })} />
              </label>
              <label className="flex flex-col text-sm">
                <span className="text-gray-600">Channel</span>
                <select className="px-3 py-2 rounded-xl border" value={saleForm.channel} onChange={e => setSaleForm({ ...saleForm, channel: e.target.value })}>
                  {channels.map((c) => (<option key={c}>{c}</option>))}
                </select>
              </label>
              <label className="flex flex-col text-sm">
                <span className="text-gray-600">Tax %</span>
                <input className="px-3 py-2 rounded-xl border" type="number" value={saleForm.taxRate} onChange={e => setSaleForm({ ...saleForm, taxRate: e.target.value })} />
              </label>
              <label className="flex flex-col text-sm">
                <span className="text-gray-600">Date</span>
                <input className="px-3 py-2 rounded-xl border" type="date" value={saleForm.date} onChange={e => setSaleForm({ ...saleForm, date: e.target.value })} />
              </label>
              <button onClick={addSale} className="px-4 py-2 rounded-2xl bg-black text-white">Add Sale</button>
            </div>

            <div className="hidden sm:block overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    {["date","item","channel","filamentCost","powerCost","otherCosts","deliveryCost","totalCost","price","taxAmount","profit","printingTime"].map((col) => (
                      <th key={col} className="p-2 capitalize">{col}</th>
                    ))}
                    <th className="p-2">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 whitespace-nowrap">{s.date}</td>
                      <td className="p-2 whitespace-nowrap">{s.item}</td>
                      <td className="p-2 whitespace-nowrap">{s.channel}</td>
                      <td className="p-2">{fmtMoney(currency, s.filamentCost)}</td>
                      <td className="p-2">{fmtMoney(currency, s.powerCost)}</td>
                      <td className="p-2">{fmtMoney(currency, s.otherCosts)}</td>
                      <td className="p-2">{fmtMoney(currency, s.deliveryCost)}</td>
                      <td className="p-2">{fmtMoney(currency, s.totalCost)}</td>
                      <td className="p-2">{fmtMoney(currency, s.price)}</td>
                      <td className="p-2">{fmtMoney(currency, s.taxAmount)}</td>
                      <td className="p-2">{fmtMoney(currency, s.profit)}</td>
                      <td className="p-2">{s.printingTime} hrs</td>
                      <td className="p-2"><button onClick={() => deleteSale(i)} className="text-red-600 hover:underline">Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden space-y-3">
              {sales.map((s, i) => (
                <div key={i} className="rounded-2xl border p-3 bg-white">
                  <div className="flex justify-between text-sm mb-1"><b>{s.item}</b><span>{s.date}</span></div>
                  <div className="text-xs text-gray-500 mb-2">{s.channel}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Total: {fmtMoney(currency, s.totalCost)}</div>
                    <div>Price: {fmtMoney(currency, s.price)}</div>
                    <div>Tax: {fmtMoney(currency, s.taxAmount)}</div>
                    <div>Profit: {fmtMoney(currency, s.profit)}</div>
                    <div className="col-span-2">Time: {s.printingTime} hrs</div>
                  </div>
                  <div className="mt-2 flex justify-end"><button onClick={() => deleteSale(i)} className="text-red-600 hover:underline">Delete</button></div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* ITEMS TAB */}
        <Panel show={tab === "items"}>
          <div className="bg-white rounded-2xl p-4 shadow">
            <div className="flex flex-wrap items-end gap-2 mb-4">
              <input className="px-3 py-2 rounded-xl border" placeholder="Name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
              <input className="px-3 py-2 rounded-xl border" placeholder="Filament Cost" type="number" value={newItem.filamentCost} onChange={e => setNewItem({ ...newItem, filamentCost: e.target.value })} />
              <input className="px-3 py-2 rounded-xl border" placeholder="Power Cost" type="number" value={newItem.powerCost} onChange={e => setNewItem({ ...newItem, powerCost: e.target.value })} />
              <input className="px-3 py-2 rounded-xl border" placeholder="Other Costs" type="number" value={newItem.otherCosts} onChange={e => setNewItem({ ...newItem, otherCosts: e.target.value })} />
              <input className="px-3 py-2 rounded-xl border" placeholder="Printing Time (hrs)" type="number" value={newItem.printingTime} onChange={e => setNewItem({ ...newItem, printingTime: e.target.value })} />
              <button onClick={addItem} className="px-4 py-2 rounded-2xl bg-black text-white">Add Item</button>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <th className="p-2">Name</th><th className="p-2">Filament</th><th className="p-2">Power</th><th className="p-2">Other</th><th className="p-2">Time</th><th className="p-2">Status</th><th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id} className="border-b">
                      <td className="p-2"><input className="px-2 py-1 rounded border w-full" value={it.name} onChange={e => editItem(idx, "name", e.target.value)} /></td>
                      <td className="p-2"><input className="px-2 py-1 rounded border w-28" type="number" value={it.filamentCost} onChange={e => editItem(idx, "filamentCost", e.target.value)} /></td>
                      <td className="p-2"><input className="px-2 py-1 rounded border w-28" type="number" value={it.powerCost} onChange={e => editItem(idx, "powerCost", e.target.value)} /></td>
                      <td className="p-2"><input className="px-2 py-1 rounded border w-28" type="number" value={it.otherCosts} onChange={e => editItem(idx, "otherCosts", e.target.value)} /></td>
                      <td className="p-2"><input className="px-2 py-1 rounded border w-28" type="number" value={it.printingTime} onChange={e => editItem(idx, "printingTime", e.target.value)} /></td>
                      <td className="p-2">{it.removed ? "Removed" : "Active"}</td>
                      <td className="p-2"><button onClick={() => toggleItemStatus(idx)} className="px-3 py-1 rounded-2xl border bg-white">{it.removed ? "Restore" : "Remove"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:flex gap-2 items-end">
              <input className="px-3 py-2 rounded-xl border w-full sm:w-auto" placeholder="Add a new channel" value={newChannel} onChange={e => setNewChannel(e.target.value)} />
              <button onClick={addChannel} className="px-4 py-2 rounded-2xl bg-white border w-full sm:w-auto">Add Channel</button>
            </div>
          </div>
        </Panel>

        {/* EXPENSES TAB */}
        <Panel show={tab === "expenses"}>
          <div className="bg-white rounded-2xl p-4 shadow">
            <div className="flex flex-wrap items-end gap-2 mb-4">
              <select className="px-3 py-2 rounded-xl border" value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
                {["Machine Repairs","Filament Purchase","Waste Filament","Packaging Materials","Power Bill","Software Subscription","Marketing/Ads","Other"].map(c => <option key={c}>{c}</option>)}
              </select>
              <input className="px-3 py-2 rounded-xl border" placeholder="Description" value={newExpense.name} onChange={e => setNewExpense({ ...newExpense, name: e.target.value })} />
              <input className="px-3 py-2 rounded-xl border" placeholder="Cost" type="number" value={newExpense.cost} onChange={e => setNewExpense({ ...newExpense, cost: e.target.value })} />
              <input className="px-3 py-2 rounded-xl border" type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} />
              <button onClick={addExpense} className="px-4 py-2 rounded-2xl bg-black text-white">Add Expense</button>
              <label className="ml-2 text-sm flex items-center gap-2"><input type="checkbox" checked={showCOGS} onChange={e => setShowCOGS(e.target.checked)} />Show COGS</label>
            </div>

            <div className="overflow-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <th className="p-2">Date</th><th className="p-2">Category</th><th className="p-2">Description</th><th className="p-2">Cost</th><th className="p-2">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e, i) => (
                    <tr key={`${e.name}-${i}`} className="border-b">
                      <td className="p-2 whitespace-nowrap">{e.date}</td>
                      <td className="p-2 whitespace-nowrap">{e.category}</td>
                      <td className="p-2">{e.name}</td>
                      <td className="p-2">{fmtMoney(currency, e.cost)}</td>
                      <td className="p-2">{!e.auto && (<button onClick={() => deleteExpense(i)} className="text-red-600 hover:underline">Delete</button>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-2xl p-3">
                <h3 className="font-semibold mb-2">Expense Breakdown</h3>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie dataKey="value" data={(() => {
                        const summary = {};
                        (showCOGS ? expenses : expenses.filter((e) => !e.category.startsWith("COGS –"))).forEach((e) => {
                          if (e.category === "Filament Purchase") return;
                          summary[e.category] = (summary[e.category] || 0) + (e.cost || 0);
                        });
                        const totalFil = Math.max(0, totalFilamentPurchase - totalFilamentUsed);
                        if (totalFil > 0) summary["Filament Purchase (net)"] = totalFil;
                        return Object.entries(summary).map(([name, value]) => ({ name, value }));
                      })()} cx="50%" cy="50%" outerRadius={100} label>
                        {(() => {
                          const arr = (() => {
                            const summary = {};
                            (showCOGS ? expenses : expenses.filter((e) => !e.category.startsWith("COGS –"))).forEach((e) => {
                              if (e.category === "Filament Purchase") return;
                              summary[e.category] = (summary[e.category] || 0) + (e.cost || 0);
                            });
                            const totalFil = Math.max(0, totalFilamentPurchase - totalFilamentUsed);
                            if (totalFil > 0) summary["Filament Purchase (net)"] = totalFil;
                            return Object.entries(summary).map(([name, value]) => ({ name, value }));
                          })();
                          return arr.map((_, idx) => <Cell key={idx} fill={`hsl(${idx * 47}, 70%, 50%)`} />);
                        })()}
                      </Pie>
                      <Tooltip formatter={(val) => fmtMoney(currency, val)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-3">
                <h3 className="font-semibold mb-2">Quick Totals</h3>
                <ul className="text-sm space-y-1">
                  <li>Net Filament Purchase: <b>{fmtMoney(currency, netFilamentCost)}</b></li>
                  <li>Total Filament Purchased: {fmtMoney(currency, totalFilamentPurchase)}</li>
                  <li>Total Filament Used (COGS): {fmtMoney(currency, totalFilamentUsed)}</li>
                </ul>
              </div>
            </div>
          </div>
        </Panel>

        {/* ANALYTICS TAB */}
        <Panel show={tab === "analytics"}>
          <div className="bg-white rounded-2xl p-4 shadow space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-end gap-3 bg-gray-50 p-3 rounded-2xl border">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">From</label>
                <input className="px-3 py-2 rounded-xl border" type="date" value={rangeStart} onChange={(e)=>setRangeStart(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">To</label>
                <input className="px-3 py-2 rounded-xl border" type="date" value={rangeEnd} onChange={(e)=>setRangeEnd(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button className="px-3 py-2 rounded-xl border" onClick={()=>{ const dates=[...new Set(sales.map(s=>s.date))].sort(); if(dates.length){ setRangeStart(dates[Math.max(0,dates.length-7)]); setRangeEnd(dates[dates.length-1]); }}}>Last 7 days</button>
                <button className="px-3 py-2 rounded-xl border" onClick={()=>{ const dates=[...new Set(sales.map(s=>s.date))].sort(); if(dates.length){ setRangeStart(dates[Math.max(0,dates.length-30)]); setRangeEnd(dates[dates.length-1]); }}}>Last 30 days</button>
                <button className="px-3 py-2 rounded-xl border" onClick={()=>{ const dates=[...new Set(sales.map(s=>s.date))].sort(); if(dates.length){ setRangeStart(dates[0]); setRangeEnd(dates[dates.length-1]); }}}>All</button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs"><span className="inline-block w-3 h-3 rounded" style={{background:'#2563eb'}}></span>Revenue</span>
                <span className="inline-flex items-center gap-1 text-xs"><span className="inline-block w-3 h-3 rounded" style={{background:'#ef4444'}}></span>COGS</span>
                <span className="inline-flex items-center gap-1 text-xs"><span className="inline-block w-3 h-3 rounded" style={{background:'#22c55e'}}></span>Gross</span>
                <span className="inline-flex items-center gap-1 text-xs"><span className="inline-block w-3 h-3 rounded" style={{background:'#a855f7'}}></span>Net</span>
              </div>
            </div>

            {/* Accounting summary */}
            <div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <Stat label="Revenue" value={fmtMoney(currency, totals.revenue)} />
                <Stat label="COGS" value={fmtMoney(currency, totals.cogs)} />
                <Stat label="Gross Profit" value={fmtMoney(currency, totals.grossProfit)} />
                <Stat label="Other Expenses" value={fmtMoney(currency, totals.other)} />
                <Stat label="Net Profit" value={fmtMoney(currency, totals.netProfit)} />
              </div>
              <div className="w-full h-80 bg-gray-50 rounded-2xl p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Revenue", value: totals.revenue },
                    { name: "COGS", value: totals.cogs },
                    { name: "Gross Profit", value: totals.grossProfit },
                    { name: "Other", value: totals.other },
                    { name: "Net Profit", value: totals.netProfit }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(val) => fmtMoney(currency, val)} />
                    <Bar dataKey="value">
                      <LabelList dataKey="value" position="top" formatter={(v) => fmtMoney(currency, v)} />
                      {["#2563eb","#ef4444","#22c55e","#f59e0b","#a855f7"].map((c,i)=>(<Cell key={i} fill={c} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sales-only block with Include Cash toggle */}
            <div className="bg-gray-50 rounded-2xl p-3 border">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold">Sales-only view</h3>
                <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={showCash} onChange={(e) => setShowCash(e.target.checked)} /> Include Cash</label>
              </div>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Revenue", value: salesOnly.active.revenue },
                    { name: "COGS", value: salesOnly.active.cogs },
                    { name: "Gross Profit", value: salesOnly.active.revenue - salesOnly.active.cogs },
                    { name: "Net (after tax)", value: salesOnly.active.revenue - salesOnly.active.cogs - salesOnly.active.tax }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(val) => fmtMoney(currency, val)} />
                    <Bar dataKey="value">
                      <LabelList dataKey="value" position="top" formatter={(v) => fmtMoney(currency, v)} />
                      {["#2563eb","#ef4444","#22c55e","#a855f7"].map((c,i)=>(<Cell key={i} fill={c} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-3"><summary className="cursor-pointer select-none font-semibold">Show comparison: All sales vs Excl. Cash</summary>
                <p className="text-sm text-gray-600 mt-2">This compares <b>All sales</b> to the numbers <b>excluding Cash</b> using per-sale costs (filament, power, other, delivery) and tax. Overhead expenses from the Expenses tab are not included here.</p>
                <CashComparison currency={currency} salesOnly={salesOnly} />
              </details>
            </div>

            {/* Line over time */}
            <div className="bg-gray-50 rounded-2xl p-3 border">
              <h3 className="font-semibold mb-2">Performance over time</h3>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(val) => fmtMoney(currency, val)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" dot={false} />
                    <Line type="monotone" dataKey="cogs" name="COGS" stroke="#ef4444" dot={false} />
                    <Line type="monotone" dataKey="gross" name="Gross" stroke="#22c55e" dot={false} />
                    <Line type="monotone" dataKey="net" name="Net (after tax)" stroke="#a855f7" dot={false} />
                    <Brush dataKey="date" height={20} travellerWidth={8} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-600 mt-2">Range: {rangeStart} → {rangeEnd} {showCash ? '(Cash included)' : '(Cash excluded)'}</p>
            </div>
          </div>
        </Panel>

        {/* TIME TAB */}
        <Panel show={tab === "time"}>
          <div className="bg-white rounded-2xl p-4 shadow">
            <div className="overflow-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <th className="p-2">Item</th>
                    <th className="p-2">Total Hours</th>
                    <th className="p-2">Total Profit</th>
                    <th className="p-2">Profit/hour</th>
                    <th className="p-2">Units Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {timeData.map((t, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{t.item}</td>
                      <td className="p-2">{t.hours}</td>
                      <td className="p-2">{fmtMoney(currency, t.profit)}</td>
                      <td className="p-2">{fmtMoney(currency, t.profitPerHour)}</td>
                      <td className="p-2">{t.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="w-full" style={{ height: `${Math.max(300, 50 * timeData.length)}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => fmtMoney(currency, v)} />
                  <YAxis type="category" dataKey="item" width={180} />
                  <Tooltip formatter={(v) => fmtMoney(currency, v)} />
                  <Bar dataKey="profitPerHour">
                    <LabelList dataKey="profitPerHour" position="right" formatter={(v) => fmtMoney(currency, v)} />
                    {timeData.map((entry, index) => {
                      let color = "#9ca3af";
                      if (entry.profitPerHour === highest) color = "#22c55e";
                      else if (entry.profitPerHour === lowest) color = "#ef4444";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>
      </div>

      {/* Bottom nav for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center" style={{height:'64px', paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
        {([["sales","Sales"],["items","Items"],["expenses","Expenses"],["analytics","Analytics"],["time","Time"]]).map(([id,label])=> (
          <button key={id} onClick={()=>setTab(id)} className={`flex-1 py-3 text-sm ${tab===id? 'text-black font-semibold':'text-gray-600'}`}>{label}</button>
        ))}
      </nav>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
