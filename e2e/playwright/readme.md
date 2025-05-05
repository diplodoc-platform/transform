**Using Docker CLI for Playwright tests**

1. Install Docker CLI:

   ```bash
   brew install docker
   ```

2. Create and configure a Lima VM:

   ```bash
   curl -Lo docker.yaml https://raw.githubusercontent.com/lima-vm/lima/master/examples/docker.yaml
   limactl create --name docker docker.yaml
   ```

   - Select the `docker` template when prompted.
   - Open `~/.lima/docker/lima.yaml`. Find the entry in the mounts list with location: "~" and add:
     ```yaml
     writable: true
     ```

3. Start the Lima VM and configure Docker CLI:

   ```bash
   limactl start docker
   export DOCKER_HOST="unix://$HOME/.lima/docker/sock/docker.sock"
   ```

4. Disable the Docker credential helper to allow pulling images:

   ```bash
   mv ~/.docker/config.json ~/.docker/config.json.backup
   ```

5. Update Playwright snapshots:
   ```bash
   npm run test:playwright -- --update-snapshots
   ```
