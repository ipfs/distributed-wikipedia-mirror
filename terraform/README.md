Terraform configuration that resides here creates:
- S3 bucket where website packages can be uploaded
- EC2 instance which runs ipfs where `publish_website_from_s3.sh` can be run to publish mirrors

To run `terraform` here you have to export:
- `TF_VAR_public_key` - public key which will be used to give you SSH access to EC2
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` - creds to AWS account that have enough permissions to create the resources
- `AWS_REGION` - the name of the region where S3 and EC2 should be created
