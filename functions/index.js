const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { GoogleGenerativeAI } = require("@google/generative-ai");

initializeApp();
const db = getFirestore();

const MODEL_NAME = "gemini-1.5-flash";

// Helper: Check and deduct credits transactionally
async function checkAndDeductCredits(uid, cost) {
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (t) => {
    const doc = await t.get(userRef);
    if (!doc.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }

    const userData = doc.data();
    const currentCredits = userData.credits || 0;

    if (currentCredits < cost) {
      throw new HttpsError('failed-precondition', 'Insufficient credits.');
    }

    t.update(userRef, { credits: currentCredits - cost });
  });
}

exports.scanResume = onCall({ secrets: ["GEMINI_API_KEY"] }, async (request) => {
  // Authentication check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  // Credit check (Cost: 5)
  await checkAndDeductCredits(request.auth.uid, 5);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Gemini API key is missing.');
  }

  const { fileBase64, mimeType } = request.data;
  if (!fileBase64) {
    throw new HttpsError('invalid-argument', 'File content is required.');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
      You are an expert resume parser. Extract the following information from the resume image/PDF provided and return it in a strict JSON format.
      
      Schema:
      {
        "name": "string",
        "phone": "string",
        "email": "string",
        "links": "string (comma separated)",
        "summary": "string (comprehensive summary)",
        "experience": [
            {
                "role": "string",
                "company": "string",
                "dates": "string",
                "details": "string (bullet points separated by <br> or newline)"
            }
        ],
        "education": [
            {
                "school": "string",
                "degree": "string",
                "dates": "string",
                "details": "string"
            }
        ],
        "skills": "string (grouped by category)"
      }

      Return ONLY the JSON. Do not include markdown naming like \`\`\`json.
    `;

    const imagePart = {
      inlineData: {
        data: fileBase64,
        mimeType: mimeType || "application/pdf"
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Clean up potential markdown code blocks if Gemini adds them
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanText);

  } catch (error) {
    console.error("Error scanning resume:", error);
    throw new HttpsError('internal', 'Failed to scan resume.', error.message);
  }
});

exports.rewriteContent = onCall({ secrets: ["GEMINI_API_KEY"] }, async (request) => {
  // Authentication check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  // Credit check (Cost: 1)
  await checkAndDeductCredits(request.auth.uid, 1);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Gemini API key is missing.');
  }

  const { text, instruction } = request.data;
  if (!text) {
    throw new HttpsError('invalid-argument', 'Text to rewrite is required.');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
            You are a professional resume editor. Rewrite the following text to be more impactful, concise, and professional. 
            Use strong action verbs.
            
            Instruction: ${instruction || "Improve clarity and impact."}
            
            Original Text:
            "${text}"
            
            Return ONLY the rewritten text.
        `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return { rewrittenText: response.text().trim() };

  } catch (error) {
    console.error("Error rewriting content:", error);
    throw new HttpsError('internal', 'Failed to rewrite content.', error.message);
  }
});

exports.handleStripeWebhook = onRequest(async (req, res) => {
  // In a real app, verify Stripe signature here using endpoint secret
  const event = req.body;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const uid = session.client_reference_id; // Metadata passed during matching checkout
    const amountPaid = session.amount_total;

    // Simple logic: £10 = 1000 credits, £5 = 500 credits
    // Adjust based on your Strategy
    let creditsToAdd = 0;
    if (amountPaid === 1000) creditsToAdd = 1000;
    if (amountPaid === 500) creditsToAdd = 500;
    if (amountPaid === 4900) creditsToAdd = 12000;

    if (uid && creditsToAdd > 0) {
      const userRef = db.collection('users').doc(uid);
      await userRef.set({
        credits: admin.firestore.FieldValue.increment(creditsToAdd)
      }, { merge: true });
      console.log(`Added ${creditsToAdd} credits to user ${uid}`);
    }
  }

  res.json({ received: true });
});
