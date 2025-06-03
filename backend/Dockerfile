# syntax=docker/dockerfile:1

FROM python:3.10-bullseye
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /code
RUN apt-get update
RUN apt-get install -y  curl

COPY requirements.txt /code/
Run /usr/local/bin/python -m pip install --upgrade pip
RUN pip install -r requirements.txt
COPY . /code/
