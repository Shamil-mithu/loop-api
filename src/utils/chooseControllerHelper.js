
function chooseController(protectedCtrl, publicCtrl) {
  return (req, res, next) => {
    const token = req.headers["authorization"];
    const ctrl = (token && token.trim() !== "") ? protectedCtrl : publicCtrl;

    if (Array.isArray(ctrl)) {
      return ctrl.reduceRight(
        (nextFn, fn) => (r, s, n) => fn(r, s, () => nextFn(r, s, n)),
        (r, s, n) => next(r, s, n)
      )(req, res, next);
    }

    return ctrl(req, res, next);
  };
}

module.exports = chooseController;
