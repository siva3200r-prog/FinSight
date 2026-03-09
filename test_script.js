const data = [
    { amount: 199, category: "Entertainment", description: "Netflix basic", date: "2026-01-05", is_subscription: true, merchant_name: "Netflix", payment_method: "Credit Card", location: "Online", mood: "Regular", classification: "Non-Essential" },
    { amount: 199, category: "Entertainment", description: "Netflix basic", date: "2026-02-05", is_subscription: true, merchant_name: "Netflix", payment_method: "Credit Card", location: "Online", mood: "Regular", classification: "Non-Essential" },
    { amount: 199, category: "Entertainment", description: "Netflix basic", date: "2026-03-05", is_subscription: true, merchant_name: "Netflix", payment_method: "Credit Card", location: "Online", mood: "Regular", classification: "Non-Essential" },
    { amount: 300, category: "Food", description: "Burger", date: "2026-03-06", is_subscription: false, merchant_name: "Burger King", payment_method: "Cash", location: "Restaurant", mood: "Hunger", classification: "Non-Essential" },
];

async function run() {
    for (const item of data) {
        await fetch("http://localhost:3000/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item)
        });
    }
    const res = await fetch("http://localhost:3000/api/subscriptions/detect");
    const json = await res.json();
    console.log("Subscriptions:", json);
}
run();
