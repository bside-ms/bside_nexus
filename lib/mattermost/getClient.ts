import { Client4 } from '@mattermost/client';

let mattermostClient: Client4 | null = null;

const getMattermostClient = async (): Promise<Client4> => {
    if (mattermostClient !== null) {
        return mattermostClient;
    }

    const client = new Client4();

    client.setUrl(process.env.MATTERMOST_URL);
    client.setToken(process.env.MATTERMOST_AUTH_TOKEN);

    mattermostClient = client;

    return mattermostClient;
};

export default getMattermostClient;
