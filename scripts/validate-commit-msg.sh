#!/bin/bash

minlen=10
message=$(cat "$1")

regex='^(chore|docs|feat|fix|refactor|test|build|ci|style|perf): ([a-z].*[^.])$'

if ! [[ "$message" =~ $regex ]]; then
  echo
  echo "Invalid commit message."
  echo
  echo "Expected format:"
  echo "  <type>: <subject>"
  echo
  echo "Allowed types:"
  echo "  feat, fix, docs, refactor, test, chore, build, ci, style, perf"
  echo
  echo "Examples:"
  echo "  feat: add trip request creation"
  echo "  fix: validate holiday departure date"
  echo "  test: cover canceled trip request flow"
  echo
  exit 1
fi

subject="${message#*: }"

if [ "${#subject}" -lt "$minlen" ]; then
  echo
  echo "Commit subject too short. Minimum length: $minlen characters."
  echo
  exit 1
fi

exit 0