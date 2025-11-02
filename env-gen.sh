#!/bin/bash

# Example .env generator
sed 's/=.*/=/' ./src/.env > ./src/.env.example
