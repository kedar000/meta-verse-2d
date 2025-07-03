import { useForm } from "react-hook-form";

type FormData = {
  email: string;
  password: string;
};

const SignIn = () => {
  const { register, handleSubmit } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    console.log("Sign In Data:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto mt-20 space-y-4">
      <h2 className="text-xl font-bold">Sign In</h2>
      <input
        {...register("email")}
        placeholder="Email"
        className="w-full p-2 border rounded"
      />
      <input
        {...register("password")}
        type="password"
        placeholder="Password"
        className="w-full p-2 border rounded"
      />
      <button type="submit" className="bg-blue-500 text-white p-2 rounded w-full">Sign In</button>
    </form>
  );
};

export default SignIn;
