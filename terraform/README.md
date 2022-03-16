This directory contains 2 terraform configurations:
- `ec2`: for creating an EC2 instance with IPFS ports exposed to public and docker installed
- `ecr`: for creating a public ECR repository which can be used to store `distributed-wikipedia-mirror` images

The terraform configurations expect the following environment variables:
- `AWS_REGION` (ec2 only): the region to create the resources in
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`: the credentials to the account to create the resources in

###### How to publish a new distributed wikipedia mirror on a new instance?

1. Create a new instance instance.
    ```bash
    cd terraform/ec2
    terraform apply
    ```
1. SSH to the newly created instance. The exact command will be printed as an output of `terraform apply`.
    ```bash
    ssh -i <private_key> ec2-user@<public_dns>
    ```
1. Create a new distributed wikipedia mirror.
    ```bash
    docker run --name wikipedia-on-ipfs --ulimit nofile=65536:65536 -d -p 4001:4001/tcp -p 4001:4001/udp public.ecr.aws/c4h1q7d1/distributed-wikipedia-mirror:latest <mirrorzim_arguments>
    ```
1. Find the CID of the newly created distributed wikipedia mirror. It might take a while for it to become available.
    ```bash
    docker logs wikipedia-on-ipfs
    ```

###### How to create a new ECR repository?

It will print out a bunch of useful commands that should be updated in the docs.
```bash
cd terraform/ecr
terraform apply
```

###### How to create a new docker image?

1. Log in to the ECR.
    ```bash
    aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws/c4h1q7d1/distributed-wikipedia-mirror
    ```
1. Build a new docker image.
    ```bash
    docker build . --platform=linux/amd64 -f Dockerfile -t public.ecr.aws/c4h1q7d1/distributed-wikipedia-mirror -t public.ecr.aws/c4h1q7d1/distributed-wikipedia-mirror:$(date -u +%F) -t public.ecr.aws/c4h1q7d1/distributed-wikipedia-mirror:$(date -u +%s)
    ```
1. Push the newly created docker image.
    ```bash
    docker push --all-tags public.ecr.aws/c4h1q7d1/distributed-wikipedia-mirror
    ```
