import {
  getGiteaRequestOptions,
  GiteaIntegrationConfig,
} from '@backstage/integration';
import axios from 'axios';

// client for Gitea API using axios 
const createGiteaClient = async (
  config: GiteaIntegrationConfig
) => {
  const options = getGiteaRequestOptions(config);
  const client = axios.create(options);

  return client;
}

export default createGiteaClient;
