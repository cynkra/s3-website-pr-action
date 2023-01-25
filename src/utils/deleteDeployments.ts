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
      ...repo,
      environment: environment
    });

    // const deployments = await octokit.graphql(`
    //   query GetDeployments($owner: String!, $repo: String!, $environments: [String!]) {
    //     repository(owner: $owner, name: $repo) {
    //       deployments(first: 100, environments: $environments) {
    //         nodes {
    //           id
    //         }
    //       }
    //     }
    //   }`, { ...repo, environments: [environment] })

    // const nodes = deployments.repository?.deployments?.nodes;

    console.log(JSON.stringify(deployments))

    for (const deployment of deployments.data) {  
      await octokit.repos.deleteDeployment({
        ...repo,
        deployment_id: deployment.id
      })
    };
    
    // if (nodes.length <= 0) {
    //     console.log(`No exiting deployments found for pull request`);
    //     return;
    // }

    // for (const node of nodes) {
    //     console.log(`Deleting existing deployment - ${node.id}`);

    //     await octokit.graphql(`
    //       mutation DeleteDeployment($id: ID!) {
    //         deleteDeployment(input: {id: $id} ) {
    //           clientMutationId
    //         }
    //       }
    //     `, { id: node.id })
    // }
}
