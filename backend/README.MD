# Project Installation Guide

This guide provides step-by-step instructions to set up and run the Django application locally.

## Prerequisites

- Python 3.x installed
- pip (Python package manager)
- Docker installed
- AWS SES credentials (optional, for email functionality)

## Installation Steps



1. **Set Up Environment Variables**

   Rename the `variables.txt` file to `.env` and populate the required environment variables. If using AWS SES for sending emails, include the necessary AWS credentials (optional).

   ```bash
   mv variables.txt .env
   docker compose up
   ```
