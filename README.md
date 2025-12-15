## Attorney Commission Calculator

A simple, clean 2-step attorney commission calculator that uses an Azure model to:

- **Step 1**: select the matching commission rule from your pasted rules sheet and calculate **user payment**.
- **Step 2**: (only if originator ≠ user) calculate **originator payment** as a % of the already-calculated user payment.

### How the system works

- **User payment**: the backend prompts the model with your pasted rules sheet as the authoritative source, asks it to pick the best matching rule + percentage, then calculates: `user_payment = amount * percentage`.
- **Originator payment**: after Step 1, you can click a second button to compute: `originator_payment = user_payment * (own_origination_percent / 100)`. If originator == user, originator payment is **$0**.

### Environment variables (Azure OpenAI)

Set these three:

- **`AZURE_OPENAI_ENDPOINT`**: e.g. `https://<resource-name>.openai.azure.com`
- **`AZURE_OPENAI_API_KEY`**
- **`AZURE_OPENAI_DEPLOYMENT`**: your deployment name (the model deployment)

Optional:

- **`AZURE_OPENAI_API_VERSION`** (defaults to `2024-10-21`)

### Run locally

```bash
npm install
npm run start
```

Open `http://localhost:3000`.
