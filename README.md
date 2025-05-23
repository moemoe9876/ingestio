# PDF to Structured Data with Next.js and Gemini 2.0

This project demonstrates how to extract structured data from PDFs using Google's Gemini 2.0 AI model in a Next.js web application. It allows users to upload PDFs and dynamically generate JSON schemas based on user prompts, which are then used to extract structured information from the documents.

**How It Works:**

1. **Upload PDF**: Users can upload their images / PDF documents through the web interface
2. **Define Schema**: Users provide a natural language prompt describing the data they want to extract
3. **Schema Generation**: Gemini 2.0 generates a JSON schema based on the user's prompt
4. **Data Extraction**: The Schema is used to extract structured data from the PDF using structured output from Gemini 2.0
5. **Results**: Extracted data is presented in a clean, organized format

## Features

- 📄 PDF file upload and preview
- 🤖 Dynamic JSON schema generation using Gemini 2.0
- 🔍 Structured Outputs using Gemini 2.0
- ⚡  Next.js frontend with shadcn/ui
- 🎨 Uses Gemini 2.0 Javascript SDK

## Getting Started

### Local Development

First, set up your environment variables:

```bash
cp .env.example .env
```

Add your Google AI Studio API key to the `.env` file:

```
GEMINI_API_KEY=your_google_api_key
```

Then, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Docker Deployment

1. Build the Docker image:

```bash
docker build -t pdf-structured-data .
```

2. Run the container with your Google API key:

```bash
docker run -p 3000:3000 -e GEMINI_API_KEY=your_google_api_key pdf-structured-data
```

Or using an environment file:

```bash
# Run container with env file
docker run -p 3000:3000 --env-file .env pdf-structured-data
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework for the web application
- [Google Gemini 2.0](https://deepmind.google/technologies/gemini/) - AI model for schema generation and data extraction
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable components built using Radix UI and Tailwind CSS 

## Vercel AI SDK with Google Vertex AI Integration

### Overview

This project integrates with Google's Gemini models through the Vercel AI SDK and Google Vertex AI. The integration allows for both text generation and structured data extraction from various document types, including PDFs and images.

### Requirements

- Google Cloud Platform (GCP) project with access to Vertex AI and Gemini models
- Service account with permission to access Vertex AI APIs
- Environment variables configured for authentication


## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](./LICENSE) file for details.

