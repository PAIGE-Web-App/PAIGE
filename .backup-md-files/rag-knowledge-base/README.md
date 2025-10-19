# PAIGE RAG Knowledge Base

This directory contains the knowledge base for PAIGE's RAG (Retrieval-Augmented Generation) system.

## Directory Structure

### `/wedding-guides/`
Contains comprehensive wedding planning guides and timelines that help users understand the planning process and make informed decisions.

### `/vendor-templates/`
Contains contract templates, checklists, and guides for working with different types of wedding vendors (photographers, caterers, florists, etc.).

### `/best-practices/`
Contains best practices, tips, and common pitfalls to help users avoid mistakes and make better decisions.

### `/user-documents/`
This directory will contain processed user documents (contracts, invoices, proposals) that have been analyzed and stored for future reference and comparison.

## How It Works

1. **Document Processing**: When users upload documents, they are processed and relevant chunks are stored in the vector database
2. **Knowledge Retrieval**: When users ask questions, the system retrieves relevant information from this knowledge base
3. **Context-Aware Responses**: The AI uses both the retrieved knowledge and the user's specific document to provide accurate, helpful responses

## Adding New Content

To add new knowledge base content:

1. Create a new markdown file in the appropriate directory
2. Use clear, descriptive titles and headings
3. Include practical, actionable information
4. Focus on wedding-specific content that will help users
5. Keep content up-to-date and accurate

## Content Guidelines

- **Wedding-Focused**: All content should be relevant to wedding planning
- **Actionable**: Provide specific, actionable advice
- **Accurate**: Ensure all information is current and correct
- **Comprehensive**: Cover topics thoroughly but concisely
- **User-Friendly**: Write in clear, accessible language

## Maintenance

- Review and update content regularly
- Remove outdated information
- Add new content based on user feedback
- Monitor content performance and effectiveness
