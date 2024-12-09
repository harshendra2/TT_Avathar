#!/bin/bash

# Define the log file with an absolute path
LOG_FILE="/root/backendlogs/cron_test.log"

# Log the start of the script
echo "$(date '+%Y-%m-%d %H:%M:%S') - Script started" >> $LOG_FILE

# Run the curl command and capture the output and exit status
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null https://ttavatar-test.xyz/api/partneractivity/storeteamstatistics?flag=true)
STATUS=$?

# Check the exit status and log appropriately
if [ $STATUS -eq 0 ]; then
  if [ "$RESPONSE" -eq 200 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Success: Received HTTP 200" >> $LOG_FILE
  else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Warning: Received HTTP $RESPONSE" >> $LOG_FILE
  fi
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Error: curl command failed with exit status $STATUS" >> $LOG_FILE
fi

# Log the end of the script
echo "$(date '+%Y-%m-%d %H:%M:%S') - Script ended" >> $LOG_FILE
