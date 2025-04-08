# shim-node.sh
# creates a fake node binary and prepends it to $PATH. This way, any tests trying
# to run `node` will fail

node_dir=$(mktemp -d)
echo "making fake node dir: $node_dir"
printf "#!/bin/bash \necho 'Test case tried to use node!'; \nexit 1" > $node_dir/node
chmod +x $node_dir/node
chmod a+x $node_dir/node
echo "export PATH=\"$node_dir:\$PATH\"" >> ~/.bashrc
export PATH="$node_dir:$PATH"
