async function responseHandler(request, name) {
  try {
    const result = await request;

    console.log(result.data);
    return result.data;
  } catch (error) {
    if (name == "adaverse") {
      // console.log(error)
      console.log(error.response?.data?.message);
      throw new Error(error?.response?.data?.message);
    }
    console.log(error);
    if (error?.response?.data?.message)
      throw new Error(error.response.data.message);
    else throw new Error(error.message ?? error);
  }
}

module.exports = responseHandler;
