export async function register() {
  if (process.env.MY_TZ) {
    process.env.TZ = process.env.MY_TZ;
  }
}
