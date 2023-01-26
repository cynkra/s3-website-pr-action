import * as github from "@actions/github";
import octokit from '../octokit';

export default async (
    repo: {
        owner: string;
        repo: string;
    },
    environmentPrefix: string
) => {
    const environment = `${environmentPrefix || 'PR-'}${github.context.payload.pull_request!.number}`;

    const deployments = await octokit.repos.listDeployments({
        repo: repo.repo,
        owner: repo.owner,
        environment,
    });

    const existing = deployments.data.length;
    if (existing < 1) {
        console.log(`No exiting deployments found for pull request`);
        return;
    }

    for (const deployment of deployments.data) {
        console.log(`Deactivating existing deployment - ${deployment.id}`);

        await octokit.repos.createDeploymentStatus({
            ...repo,
            deployment_id: deployment.id,
            state: 'inactive',
        });
    }
}
