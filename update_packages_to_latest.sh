echo "Updating resolutions..."
jq 'del(.resolutions)' package.json > temp.json && mv temp.json package.json

echo "Updating dependencies..."
for package in $(jq -r '.dependencies | keys[]' package.json | grep "midnight-ntwrk"); do
  echo "Updating $package to latest version..."
  yarn add "$package@latest"
done

echo "Updating devDependencies..."
for package in $(jq -r '.devDependencies | keys[]' package.json | grep "midnight-ntwrk"); do
  echo "Updating $package to latest version..."
  yarn add "$package@latest"
done
