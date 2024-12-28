import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || '',
});

const retrieve = async(query) => {
    const index = pc.Index('simple-rag');
  
    const queryEmbedding = await new OpenAIEmbeddings().embedQuery(query);

    const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 3,
        includeMetadata: true
    });
    console.log(queryResponse)
    const context = queryResponse.matches.map((match, index) => `[${index}] ${match.metadata.text}`).join('\n');
    return context;
}



export async function POST(request) {
    const { query } = await request.json();
    const context = await retrieve(query);
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { 
                role: "system", 
                content: `You are an assistive chatbot for Alliance of Computer Science Students (ACSS) - UPLB
                        # User Interaction Guidelines

                    - Be engaging and friendly in tone.
                    - Politely inform users when a question is outside the scope of available context.
                    - Acknowledge questions and use available organization details to craft a helpful response.

                    # Steps

                    1. **Identify** the user's query and determine if it falls within the scope of the ACSS context.
                    2. **Engage** courteously with a greeting or acknowledgment.
                    3. **Use context** provided for the organization to answer questions.
                    4. **Clarify** or prompt for further information if the query is vague or general.
                    5. **Politely redirect** or inform the user if the query is not related to ACSS or falls outside the provided context.

                    # Output Format

                    - Responses should be concise and user-friendly, incorporating the organization's details.
                    - Do not provide information or responses unrelated to the organization.
                    - Engage users with a friendly and welcoming tone in each response.

                    # Examples

                    **Example 1**

                    - **User Input:** "What events does ACSS hold?"
                    - **Response:** "Hello! ACSS organizes a variety of events such as coding workshops, guest lectures, and socials to help students learn and network. Is there a specific event you would like more information about?"

                    **Example 2**

                    - **User Input:** "How do I contact the ACSS team?"
                    - **Response:** "Hi there! You can reach out to the ACSS team via our official email at [ACSS contact email] or through our Facebook page at [ACSS Facebook link]. How may we assist you further?"

                    **Example 3**

                    - **User Input:** "Can you tell me about the weather today?"
                    - **Response:** "I’m sorry, but my expertise is focused on the Alliance of Computer Science Students at UPLB. If you have any questions about our organization or events, I’d be happy to help!"

                    # Notes

                    - Ensure information used in responses is always relevant to the context of the Alliance of Computer Science Students (ACSS) at UPLB.
                    - Avoid improvising answers beyond the established context. Always maintain a polite tone when declining unrelated questions.

                    #Context: ${context}
                ` },
            {
                role: "user",
                content: query,
            },
        ],
    });

    const reply = completion.choices[0].message
    return NextResponse.json({ reply }, { status: 200 });
}
