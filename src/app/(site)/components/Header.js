import Image from "next/image";
const Header = () => {
  return (
    <>
      <div className="text-center bg-fuseYellow-lightest">
        <Image
          src="/images/logo.png"
          alt="FUSE Logo"
          style={{ margin: "auto" }}
          width="300"
          height="300"
        />
      </div>
    </>
  );
};

export default Header;
