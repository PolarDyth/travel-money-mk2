import { LoginView } from "./login-view";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function LoginPage(props: {
  searchParams: SearchParams
}) {
  const searchParams = await props.searchParams
  const error = searchParams.error

  return <LoginView error={error} />
}
