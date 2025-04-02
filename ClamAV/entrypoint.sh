#!/bin/bash

# update ClamAV virus definitions
echo "Updating ClamAV virus definitions..."
freshclam

# start ClamAV scanner
echo "Starting scanner..."
exec "$@"