import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from '@langchain/openai';

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || '',
});

const splitter1 = new CharacterTextSplitter({
  chunkSize: 256,
  chunkOverlap: 64
});

const splitter2 = new RecursiveCharacterTextSplitter({
  chunkSize: 1024,
  chunkOverlap: 128
});


export async function POST(request) {
  try {
    const { text } = await request.json();
    const chunks = await splitter2.splitText(text);
    // return NextResponse.json({ chunks }, { status: 200 });
    // const index = pc.Index('simple-rag');
    
    const embeddings = await new OpenAIEmbeddings().embedDocuments(chunks);

    // return NextResponse.json({ embeddings }, { status: 200 });

    const batchSize = 100;
    let batch = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vector = {
            id: `chunk-${i}`,
            values: embeddings[i], // Embedding values
            metadata: {
                text: chunk, // The log content
            },
        };
        batch.push(vector);

        // When batch is full or if it is the last item, upsert vectors
        if (batch.length === batchSize || i === chunks.length - 1) {
            await index.upsert(batch);
            batch = []; // Reset batch after upsert
        }
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
