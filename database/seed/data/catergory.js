const { CATEGORY_STATUS } = require("@src/constants");

const CATEGORY_DATA = [
    {
      name: "Restaurant",
      image: "https://dev-mithu.s3.me-central-1.amazonaws.com/category/c42c4ca5-cc86-4412-8cfa-f4462f023138.png",
      category_status: CATEGORY_STATUS.ACTIVE,
      display_order: 1
    },
    {
      name: "Shops",
      image: "https://dev-mithu.s3.me-central-1.amazonaws.com/category/9d99666f-3558-4e0d-87dc-c4d91cbe190d.png",
      category_status: CATEGORY_STATUS.ACTIVE,
      display_order: 2
    },
    {
      name: "NFTs",
      image: "https://dev-mithu.s3.me-central-1.amazonaws.com/category/58ff7498-8898-4d41-b082-cdb67617b33c.png",
      category_status: CATEGORY_STATUS.ACTIVE,
      display_order: 3
    },
    {
      name: "Pharmacy",
      image: "https://dev-mithu.s3.me-central-1.amazonaws.com/category/9d95a9a0-41e1-4972-bf73-20407d76ecca.png",
      category_status: CATEGORY_STATUS.ACTIVE,
      display_order: 4
    },
    {
      name: "Mithu Favor",
      image: "https://dev-mithu.s3.me-central-1.amazonaws.com/category/b58bda3b-855f-4309-a609-26230487e3d9.png",
      category_status: CATEGORY_STATUS.ACTIVE,
      display_order: 5
    },
    {
      name: "Real Estate",
      image: "https://dev-mithu.s3.me-central-1.amazonaws.com/category/ea8fdf66-7e31-42b8-a38f-969e872e3926.png",
      category_status: CATEGORY_STATUS.ACTIVE,
      display_order: 6
    }
  ]

module.exports = {
    CATEGORY_DATA
};
