variable "public_key" {
  description = "SSH public key."
  type        = string
  sensitive = true
}

variable "volume_size" {
  description = "Root block device volume size."
  type = number
  default = 100
}

variable "volume_iops" {
  description = "Root block device volume IOPS."
  type = number
  default = 3000
}

variable "volume_throughput" {
  description = "Root block device volume throughput (MiB/s)."
  type = number
  default = 125
}
